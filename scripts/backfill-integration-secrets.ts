/**
 * Encrypts CompanyIntegration.key rows that are still stored in plaintext.
 *
 * Step 3 of 4 (see PRs #85, #86). Reads were routed through lib/integration-secrets
 * (#85) and writes now encrypt (#86) — but rows written before that are still plaintext
 * and stay that way until someone re-saves each integration by hand. This closes that.
 *
 * Safe to run repeatedly: already-encrypted rows are detected and skipped, so a second
 * run is a no-op. Readers tolerate both formats either way (decryptConfigValueSafe passes
 * plaintext through), so this is a confidentiality fix, not a correctness one — nothing
 * breaks if it is never run, and nothing breaks if it is run twice.
 *
 *   npm run integrations:encrypt:dry-run     # report only, writes nothing (default)
 *   npm run integrations:encrypt:apply       # actually encrypt
 *
 * Requires CONFIG_ENCRYPTION_KEY — the same key the app encrypts/decrypts with. Running
 * this with the wrong key would make every secret undecryptable, so it verifies a
 * round-trip on each value BEFORE writing and aborts the row if it fails.
 */
import { prisma } from '../src/lib/prisma';
import { encryptConfigValue, decryptConfigValue } from '../src/lib/config-crypto';

/** Matches the `<32 hex iv>:<hex ciphertext>` shape encryptConfigValue emits. */
const ENCRYPTED_RE = /^[0-9a-f]{32}:[0-9a-f]+$/i;

const APPLY = process.argv.includes('--apply');

/** Never print a secret, even partially, into CI logs. */
const mask = (s: string) => `${s.length} chars`;

async function main() {
    if (!process.env.CONFIG_ENCRYPTION_KEY) {
        console.error('❌ CONFIG_ENCRYPTION_KEY is not set. Aborting — encrypting with the wrong key would make every secret unreadable.');
        process.exit(1);
    }

    console.log(APPLY ? '🔐 Encrypting integration secrets (APPLY)' : '🔍 Dry run — nothing will be written. Pass --apply to write.');

    const rows = await prisma.companyIntegration.findMany({
        select: { id: true, provider: true, companyId: true, key: true },
        orderBy: { provider: 'asc' },
    });

    if (!rows.length) {
        console.log('\nNo integrations configured. Nothing to do.');
        return;
    }

    let encrypted = 0, alreadyDone = 0, empty = 0, failed = 0;

    for (const row of rows) {
        const label = `${row.provider} (company ${row.companyId})`;

        if (!row.key) {
            console.log(`  ○ ${label} — no secret stored, skipping`);
            empty++;
            continue;
        }

        if (ENCRYPTED_RE.test(row.key)) {
            console.log(`  ✓ ${label} — already encrypted, skipping`);
            alreadyDone++;
            continue;
        }

        // Encrypt, then immediately prove it decrypts back to the original. A silent
        // failure here would lock the credential out of the app permanently.
        const ciphertext = encryptConfigValue(row.key);
        let roundTripped: string;
        try {
            roundTripped = decryptConfigValue(ciphertext);
        } catch (e: any) {
            console.error(`  ✗ ${label} — encryption round-trip threw, leaving untouched: ${e.message}`);
            failed++;
            continue;
        }
        if (roundTripped !== row.key) {
            console.error(`  ✗ ${label} — round-trip mismatch, leaving untouched`);
            failed++;
            continue;
        }

        if (APPLY) {
            await prisma.companyIntegration.update({
                where: { id: row.id },
                data: { key: ciphertext },
            });
            console.log(`  → ${label} — encrypted (${mask(row.key)})`);
        } else {
            console.log(`  → ${label} — would encrypt (${mask(row.key)})`);
        }
        encrypted++;
    }

    console.log(
        `\n${APPLY ? 'Encrypted' : 'Would encrypt'}: ${encrypted}  |  already encrypted: ${alreadyDone}  |  no secret: ${empty}  |  failed: ${failed}`,
    );

    if (failed) {
        console.error('\n⚠️  Some rows failed their round-trip and were left as-is. Investigate before re-running.');
        process.exitCode = 1;
    } else if (!APPLY && encrypted) {
        console.log('\nRe-run with --apply to write these changes.');
    } else if (APPLY && encrypted) {
        console.log('\n🎉 Done. Verify by opening Settings → Integrations and hitting Test on a provider.');
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
