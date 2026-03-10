/**
 * crypto-vault.ts
 * 
 * Provides client-side Zero-Knowledge encryption utilities for the Vault.
 * Uses Web Crypto API (window.crypto.subtle).
 */

// Format converters
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

// 1. Master Key Derivation
export async function deriveMasterKey(password: string, email: string, predefinedSalt?: string): Promise<{ key: CryptoKey, salt: string }> {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );

    let saltBuffer: Uint8Array;
    let saltString: string;

    if (predefinedSalt) {
        saltBuffer = new Uint8Array(base64ToArrayBuffer(predefinedSalt));
        saltString = predefinedSalt;
    } else {
        // Use email combined with a random 16-byte salt for new keys
        const randomSalt = window.crypto.getRandomValues(new Uint8Array(16));
        saltBuffer = new Uint8Array(enc.encode(email).length + randomSalt.length);
        saltBuffer.set(enc.encode(email), 0);
        saltBuffer.set(randomSalt, enc.encode(email).length);
        saltString = arrayBufferToBase64(saltBuffer.buffer as ArrayBuffer);
    }

    const key = await window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: saltBuffer as unknown as BufferSource,
            iterations: 250000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );

    return { key, salt: saltString };
}

// 2. RSA Key Pair Generation for Vault
export async function generateVaultRSAKeyPair(): Promise<CryptoKeyPair> {
    return await window.crypto.subtle.generateKey(
        {
            name: 'RSA-OAEP',
            modulusLength: 4096,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256'
        },
        true,
        ['encrypt', 'decrypt']
    );
}

// 3. Encrypt Private Key with Master Key
export async function encryptPrivateKey(masterKey: CryptoKey, privateKey: CryptoKey): Promise<{ encryptedPrivKey: string, iv: string }> {
    const exportedPrivKey = await window.crypto.subtle.exportKey('pkcs8', privateKey);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        masterKey,
        exportedPrivKey
    );

    return {
        encryptedPrivKey: arrayBufferToBase64(encrypted),
        iv: arrayBufferToBase64(iv.buffer)
    };
}

// 4. Decrypt Private Key with Master Key
export async function decryptPrivateKey(masterKey: CryptoKey, encryptedPrivKeyB64: string, ivB64: string): Promise<CryptoKey> {
    const encryptedBuffer = base64ToArrayBuffer(encryptedPrivKeyB64);
    const iv = base64ToArrayBuffer(ivB64);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        masterKey,
        encryptedBuffer
    );

    return await window.crypto.subtle.importKey(
        'pkcs8',
        decryptedBuffer,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        true,
        ['decrypt']
    );
}

// 5. Generate a random AES-GCM Key for a single VaultItem
export async function generateItemKey(): Promise<CryptoKey> {
    return await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}

// 6. Encrypt VaultItem Payload using the ItemKey
export async function encryptItemPayload(itemKey: CryptoKey, payload: any): Promise<{ encryptedData: string, iv: string }> {
    const enc = new TextEncoder();
    const encodedPayload = enc.encode(JSON.stringify(payload));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        itemKey,
        encodedPayload
    );

    return {
        encryptedData: arrayBufferToBase64(encrypted),
        iv: arrayBufferToBase64(iv.buffer)
    };
}

// 7. Decrypt VaultItem Payload using the ItemKey
export async function decryptItemPayload(itemKey: CryptoKey, encryptedDataB64: string, ivB64: string): Promise<any> {
    const encryptedBuffer = base64ToArrayBuffer(encryptedDataB64);
    const iv = base64ToArrayBuffer(ivB64);

    const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        itemKey,
        encryptedBuffer
    );

    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decrypted));
}

// 8. Encrypt an ItemKey using a User's RSA Public Key (for saving or sharing)
export async function encryptItemKeyWithRSA(publicKeySpkiB64: string, itemKey: CryptoKey): Promise<string> {
    // Import the public key
    const spkiBuffer = base64ToArrayBuffer(publicKeySpkiB64);
    const publicKey = await window.crypto.subtle.importKey(
        'spki',
        spkiBuffer,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        true,
        ['encrypt']
    );

    // Export the AES item key to raw bytes
    const exportedItemKey = await window.crypto.subtle.exportKey('raw', itemKey);

    // Encrypt the raw AES key using the RSA public key
    const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        publicKey,
        exportedItemKey
    );

    return arrayBufferToBase64(encryptedKeyBuffer);
}

// 9. Decrypt an ItemKey using the User's RSA Private Key
export async function decryptItemKeyWithRSA(privateKey: CryptoKey, encryptedKeyB64: string): Promise<CryptoKey> {
    const encryptedKeyBuffer = base64ToArrayBuffer(encryptedKeyB64);

    const decryptedRawKey = await window.crypto.subtle.decrypt(
        { name: 'RSA-OAEP' },
        privateKey,
        encryptedKeyBuffer
    );

    return await window.crypto.subtle.importKey(
        'raw',
        decryptedRawKey,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}

// Export a public key to SPKI base64 format for sharing
export async function exportPublicKeySpki(publicKey: CryptoKey): Promise<string> {
    const spkiBuffer = await window.crypto.subtle.exportKey('spki', publicKey);
    return arrayBufferToBase64(spkiBuffer);
}
