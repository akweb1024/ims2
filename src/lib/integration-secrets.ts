import { prisma } from '@/lib/prisma';
import { withDecryptedKey } from '@/lib/config-crypto';

/**
 * The single read path for CompanyIntegration rows.
 *
 * `CompanyIntegration.key` holds the provider secret (Razorpay key_secret, Gemini
 * API key, WhatsApp access/auth token, plagiarism HMAC secret). Readers must go
 * through here rather than calling `prisma.companyIntegration` directly, so that
 * decryption happens in exactly one place.
 *
 * That indirection is the point: the sibling AppConfiguration bug happened
 * precisely because each call site read the stored value itself, and one of them
 * was missed. If you find yourself reaching for `prisma.companyIntegration` in a
 * reader, add the case here instead.
 *
 * Server-only — do NOT re-export from `@/lib/integrations`, which is imported by
 * the client settings page and must stay free of prisma.
 *
 * `key` is currently stored in plaintext; `decryptConfigValueSafe` passes plaintext
 * through untouched, so this is a no-op until the write path starts encrypting.
 */

/** Fetches one company's integration for a provider, with `key` decrypted. */
export async function getCompanyIntegration(companyId: string, provider: string) {
    const integration = await prisma.companyIntegration
        .findUnique({
            where: {
                companyId_provider: {
                    companyId,
                    // Providers are stored uppercase by the write route.
                    provider: provider.toUpperCase(),
                },
            },
        })
        .catch(() => null);

    return withDecryptedKey(integration);
}

/** Fetches every active integration for a provider across companies, keys decrypted. */
export async function getActiveIntegrationsByProvider(provider: string) {
    const integrations = await prisma.companyIntegration.findMany({
        where: { provider: provider.toUpperCase(), isActive: true },
    });

    return integrations.map((integration) => withDecryptedKey(integration)!);
}
