import crypto from 'crypto';

/**
 * Encryption for AppConfiguration values (API keys, gateway secrets).
 *
 * Extracted from the settings/configurations route so that *readers* —
 * razorpay.ts and anything else resolving credentials — decrypt with the same
 * implementation that wrote the value. A private copy in the write path is how
 * these two drifted apart in the first place.
 *
 * Not related to lib/crypto-vault.ts, which is the Password Vault's
 * client-side WebCrypto and never touches AppConfiguration.
 */

const ALGORITHM = 'aes-256-cbc';

/** Matches the `<32 hex iv>:<hex ciphertext>` shape that encrypt() emits. */
const ENCRYPTED_RE = /^[0-9a-f]{32}:[0-9a-f]+$/i;

function getEncryptionKey(): string {
    const key = process.env.CONFIG_ENCRYPTION_KEY;
    if (!key) {
        throw new Error('CONFIG_ENCRYPTION_KEY is required');
    }
    return key;
}

export function encryptConfigValue(text: string): string {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(getEncryptionKey(), 'salt', 32);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

export function decryptConfigValue(text: string): string {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift()!, 'hex');
    const encryptedText = parts.join(':');
    const key = crypto.scryptSync(getEncryptionKey(), 'salt', 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

/**
 * Decrypts a stored value, tolerating rows written before encryption existed.
 *
 * Returns null rather than throwing when a value looks encrypted but won't
 * decrypt — e.g. written under a rotated CONFIG_ENCRYPTION_KEY. Callers must
 * treat null as "unusable credential" and fall through to their next source;
 * returning the raw ciphertext instead is what made a bad key look like a
 * Razorpay auth failure rather than a configuration problem.
 */
export function decryptConfigValueSafe(value: string | null | undefined): string | null {
    if (!value) return null;
    if (!ENCRYPTED_RE.test(value)) return value; // legacy plaintext row
    try {
        return decryptConfigValue(value);
    } catch {
        return null;
    }
}
