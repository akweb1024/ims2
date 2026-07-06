import crypto from 'crypto';

// Per-application share tokens for the public "track my application" page.
// Same stateless pattern as public-invoice-token: HMAC of the id, so the
// candidate's tokenized link is unguessable and no DB column is needed.
function tokenSecret(): string {
    return process.env.APPLICATION_STATUS_TOKEN_SECRET || process.env.AUTH_SECRET || '';
}

export function applicationStatusToken(applicationId: string): string | null {
    const secret = tokenSecret();
    if (!secret) return null;
    return crypto
        .createHmac('sha256', secret)
        .update(`job-application:${applicationId}`)
        .digest('base64url')
        .slice(0, 32);
}

export function verifyApplicationStatusToken(applicationId: string, token: string | null): boolean {
    if (!token) return false;
    const expected = applicationStatusToken(applicationId);
    if (!expected) return false;
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}
