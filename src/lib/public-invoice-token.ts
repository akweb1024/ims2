import crypto from 'crypto';

// Per-invoice share tokens for the public invoice page (/p/[id]).
// Replaces the single shared PUBLIC_INVOICE_ACCESS_CODE: each invoice gets an
// unguessable token derived from the server secret, so leaking one link never
// exposes any other invoice. Stateless — no DB column needed.
function tokenSecret(): string {
    return process.env.PUBLIC_INVOICE_TOKEN_SECRET || process.env.AUTH_SECRET || '';
}

export function publicInvoiceToken(invoiceId: string): string | null {
    const secret = tokenSecret();
    if (!secret) return null;
    return crypto
        .createHmac('sha256', secret)
        .update(`public-invoice:${invoiceId}`)
        .digest('base64url')
        .slice(0, 32);
}

export function verifyPublicInvoiceToken(invoiceId: string, token: string | null): boolean {
    if (!token) return false;
    const expected = publicInvoiceToken(invoiceId);
    if (!expected) return false;
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}
