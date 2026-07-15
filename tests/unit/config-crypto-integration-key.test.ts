import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.CONFIG_ENCRYPTION_KEY = 'unit-test-config-encryption-key';

import { encryptConfigValue, withDecryptedKey } from '../../src/lib/config-crypto';

const SECRET = 'rzp_live_secret_value';

// Only the fields withDecryptedKey cares about; the real row has more.
const row = (key: string) => ({ id: 'i1', provider: 'RAZORPAY', key, isActive: true });

describe('withDecryptedKey (CompanyIntegration.key)', () => {
    it('passes a plaintext key through untouched', () => {
        // The write path does not encrypt yet, so every existing row hits this branch.
        assert.equal(withDecryptedKey(row(SECRET))?.key, SECRET);
    });

    it('decrypts an encrypted key', () => {
        assert.equal(withDecryptedKey(row(encryptConfigValue(SECRET)))?.key, SECRET);
    });

    it('preserves the other columns', () => {
        const out = withDecryptedKey(row(SECRET));
        assert.equal(out?.provider, 'RAZORPAY');
        assert.equal(out?.isActive, true);
        assert.equal(out?.id, 'i1');
    });

    it('returns null for a missing row', () => {
        assert.equal(withDecryptedKey(null), null);
    });

    it("collapses an undecryptable key to '' — never ciphertext", () => {
        // Readers all guard with `!integration.key`, so '' means "not configured" and
        // they fall through to env credentials. Returning the ciphertext instead would
        // send it to the provider and surface as an auth error.
        const enc = encryptConfigValue(SECRET);
        const original = process.env.CONFIG_ENCRYPTION_KEY;

        process.env.CONFIG_ENCRYPTION_KEY = 'a-rotated-different-key';
        try {
            const out = withDecryptedKey(row(enc));
            assert.equal(out?.key, '');
            assert.notEqual(out?.key, enc);
        } finally {
            process.env.CONFIG_ENCRYPTION_KEY = original;
        }
    });
});
