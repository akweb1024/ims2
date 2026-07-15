import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// config-crypto reads CONFIG_ENCRYPTION_KEY at call time, not at import time,
// so setting it here (and swapping it mid-test below) is enough.
process.env.CONFIG_ENCRYPTION_KEY = 'unit-test-config-encryption-key';

import {
    encryptConfigValue,
    decryptConfigValue,
    decryptConfigValueSafe,
} from '../../src/lib/config-crypto';

const SECRET = 'rzp_live_AbC123XyZ_secret';

describe('config-crypto (AppConfiguration secret storage)', () => {
    it('round-trips an encrypted value', () => {
        const enc = encryptConfigValue(SECRET);
        assert.notEqual(enc, SECRET);
        assert.match(enc, /^[0-9a-f]{32}:[0-9a-f]+$/);
        assert.equal(decryptConfigValue(enc), SECRET);
    });

    it('uses a random IV, so the same input encrypts differently each time', () => {
        assert.notEqual(encryptConfigValue(SECRET), encryptConfigValue(SECRET));
    });

    it('decryptConfigValueSafe decrypts values written by encryptConfigValue', () => {
        assert.equal(decryptConfigValueSafe(encryptConfigValue(SECRET)), SECRET);
    });

    it('passes legacy plaintext rows through untouched', () => {
        // Rows written before encryption existed must keep working.
        assert.equal(decryptConfigValueSafe(SECRET), SECRET);
        assert.equal(decryptConfigValueSafe('rzp_test_plain'), 'rzp_test_plain');
    });

    it('treats null/undefined/empty as no credential', () => {
        assert.equal(decryptConfigValueSafe(null), null);
        assert.equal(decryptConfigValueSafe(undefined), null);
        assert.equal(decryptConfigValueSafe(''), null);
    });

    it('returns null — never ciphertext — when the value will not decrypt', () => {
        // Regression guard: razorpay.ts previously passed the raw stored value to the
        // Razorpay SDK, so an undecryptable secret surfaced as an opaque auth error
        // instead of a configuration problem. Callers rely on null to fall through.
        const enc = encryptConfigValue(SECRET);
        const original = process.env.CONFIG_ENCRYPTION_KEY;

        process.env.CONFIG_ENCRYPTION_KEY = 'a-rotated-different-key';
        try {
            const out = decryptConfigValueSafe(enc);
            assert.equal(out, null);
            assert.notEqual(out, enc);
        } finally {
            process.env.CONFIG_ENCRYPTION_KEY = original;
        }
    });
});
