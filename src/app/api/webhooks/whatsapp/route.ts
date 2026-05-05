import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function getVerifyToken() {
    return process.env.WHATSAPP_META_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN || '';
}

function getMetaAppSecret() {
    return process.env.WHATSAPP_META_APP_SECRET || process.env.FACEBOOK_APP_SECRET || '';
}

function verifyMetaSignature(rawBody: string, signatureHeader: string | null, appSecret: string) {
    if (!signatureHeader) return false;

    const [prefix, providedDigest] = signatureHeader.split('=');
    if (prefix !== 'sha256' || !providedDigest) return false;

    const expectedDigest = crypto
        .createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex');

    try {
        const providedBuffer = Buffer.from(providedDigest, 'hex');
        const expectedBuffer = Buffer.from(expectedDigest, 'hex');
        if (providedBuffer.length !== expectedBuffer.length) return false;
        return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
    } catch {
        return false;
    }
}

/**
 * Meta Webhook Verification
 * Required by Meta when saving the callback URL.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');
    const expected = getVerifyToken();

    if (!expected) {
        return NextResponse.json(
            { error: 'Webhook verify token is not configured on server.' },
            { status: 500 }
        );
    }

    if (mode === 'subscribe' && token === expected && challenge) {
        return new NextResponse(challenge, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
        });
    }

    return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

/**
 * Meta WhatsApp Events Webhook
 * This endpoint currently acknowledges events to keep the webhook healthy.
 */
export async function POST(req: NextRequest) {
    try {
        const appSecret = getMetaAppSecret();
        if (!appSecret) {
            return NextResponse.json(
                { error: 'Webhook app secret is not configured on server.' },
                { status: 500 }
            );
        }

        const rawBody = await req.text();
        const signatureHeader = req.headers.get('x-hub-signature-256');
        const isValid = verifyMetaSignature(rawBody, signatureHeader, appSecret);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
        }

        const payload = JSON.parse(rawBody);
        console.info('[WhatsApp Webhook] Event received', {
            object: payload?.object,
            hasEntry: Array.isArray(payload?.entry),
            entryCount: Array.isArray(payload?.entry) ? payload.entry.length : 0
        });

        return NextResponse.json({ received: true }, { status: 200 });
    } catch (error) {
        console.error('[WhatsApp Webhook] Invalid payload', error);
        return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }
}
