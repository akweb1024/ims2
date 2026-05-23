import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { SESv2Client, GetAccountCommand } from '@aws-sdk/client-sesv2';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getWhatsAppReportRecipients, sendWhatsApp } from '@/lib/whatsapp';
import Razorpay from 'razorpay';

function createUnauthorized() {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

async function getCompanyIntegration(companyId: string, provider: string) {
    return prisma.companyIntegration.findUnique({
        where: {
            companyId_provider: {
                companyId,
                provider: provider.toUpperCase()
            }
        }
    });
}

async function testTwilioConnection(companyId: string) {
    const integration = await getCompanyIntegration(companyId, 'WHATSAPP_TWILIO');
    if (!integration?.isActive || !integration.key) {
        return { ok: false, message: 'WhatsApp Twilio integration is not active or missing secret token.' };
    }

    let parsedValue: Record<string, string> = {};
    try {
        parsedValue = integration.value ? JSON.parse(integration.value) : {};
    } catch {
        return { ok: false, message: 'WhatsApp config JSON is invalid. Expected accountSid and from.' };
    }

    const accountSid = parsedValue.accountSid;
    if (!accountSid) {
        return { ok: false, message: 'WhatsApp config must include accountSid in the JSON config.' };
    }

    try {
        const auth = Buffer.from(`${accountSid}:${integration.key}`).toString('base64');
        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
            method: 'GET',
            headers: {
                Authorization: `Basic ${auth}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return { ok: false, message: data?.message || 'Twilio credentials were rejected.' };
        }

        return {
            ok: true,
            message: `Twilio connection verified for account ${data?.friendly_name || accountSid}.`
        };
    } catch (error) {
        return {
            ok: false,
            message: error instanceof Error ? error.message : 'Failed to reach Twilio.'
        };
    }
}

async function testMetaConnection(companyId: string) {
    const integration = await getCompanyIntegration(companyId, 'WHATSAPP_META');
    if (!integration?.isActive || !integration.key) {
        return { ok: false, message: 'WhatsApp Meta integration is not active or missing access token.' };
    }

    let parsedValue: Record<string, string> = {};
    try {
        parsedValue = integration.value ? JSON.parse(integration.value) : {};
    } catch {
        return { ok: false, message: 'WhatsApp Meta config JSON is invalid. Expected phoneNumberId.' };
    }

    const phoneNumberId = parsedValue.phoneNumberId;
    const apiVersion = parsedValue.apiVersion || 'v22.0';
    if (!phoneNumberId) {
        return { ok: false, message: 'WhatsApp Meta config must include phoneNumberId in JSON config.' };
    }

    try {
        const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}?fields=display_phone_number,verified_name`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${integration.key}`
            }
        });

        const data = await response.json();
        if (!response.ok) {
            return { ok: false, message: data?.error?.message || 'Meta WhatsApp credentials were rejected.' };
        }

        return {
            ok: true,
            message: `Meta WhatsApp connection verified for ${data?.verified_name || data?.display_phone_number || phoneNumberId}.`
        };
    } catch (error) {
        return {
            ok: false,
            message: error instanceof Error ? error.message : 'Failed to reach Meta Graph API.'
        };
    }
}

async function testSesConnection(companyId: string) {
    const integration = await getCompanyIntegration(companyId, 'AWS_SES');
    const senderIdentity = integration?.value || process.env.AWS_SES_FROM_EMAIL || process.env.EMAIL_FROM || '';

    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        return {
            ok: false,
            message: 'AWS SES transport is not configured in server environment. Add AWS credentials first.'
        };
    }

    try {
        const ses = new SESv2Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });

        await ses.send(new GetAccountCommand({}));
        return {
            ok: true,
            message: senderIdentity
                ? `AWS SES connection verified. Current sender identity: ${senderIdentity}.`
                : 'AWS SES connection verified.'
        };
    } catch (error) {
        return {
            ok: false,
            message: error instanceof Error ? error.message : 'Failed to connect to AWS SES.'
        };
    }
}

async function testGeminiConnection(companyId: string) {
    const integration = await getCompanyIntegration(companyId, 'GEMINI');
    if (!integration?.isActive || !integration.key) {
        return { ok: false, message: 'Gemini integration is not active or missing API key.' };
    }

    try {
        const genAI = new GoogleGenerativeAI(integration.key);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent('Reply with exactly the word OK.');
        const text = result.response.text().trim();

        if (!text) {
            return { ok: false, message: 'Gemini responded without content.' };
        }

        return {
            ok: true,
            message: `Gemini connection verified. Model responded: ${text.slice(0, 60)}`
        };
    } catch (error) {
        return {
            ok: false,
            message: error instanceof Error ? error.message : 'Failed to connect to Gemini.'
        };
    }
}

async function testPlagiarismWebhook(companyId: string) {
    const integration = await getCompanyIntegration(companyId, 'PLAGIARISM_SCANNER');
    if (!integration?.isActive || !integration.key) {
        return { ok: false, message: 'Plagiarism scanner integration is not active or missing webhook secret.' };
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || '';
    const webhookUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/api/webhooks/plagiarism` : '/api/webhooks/plagiarism';

    return {
        ok: true,
        message: `Webhook listener is ready. Configure your scanner to POST to ${webhookUrl} with x-hmac-signature using the saved secret.`
    };
}

async function testRazorpayConnection(companyId: string) {
    const integration = await getCompanyIntegration(companyId, 'RAZORPAY');
    if (!integration?.isActive || !integration.key) {
        return { ok: false, message: 'Razorpay integration is not active or missing Key Secret.' };
    }

    let parsedValue: Record<string, string> = {};
    try {
        parsedValue = integration.value ? JSON.parse(integration.value) : {};
    } catch {
        parsedValue = { keyId: integration.value || '' };
    }

    const keyId = parsedValue.keyId;
    if (!keyId) {
        return { ok: false, message: 'Razorpay config JSON must include keyId.' };
    }

    try {
        const instance = new Razorpay({
            key_id: keyId,
            key_secret: integration.key,
        });
        await instance.payments.all({ count: 1 });
        return {
            ok: true,
            message: `Razorpay connection verified for key ${keyId}.`,
        };
    } catch (error) {
        return {
            ok: false,
            message: error instanceof Error ? error.message : 'Failed to connect to Razorpay.',
        };
    }
}

async function sendWhatsAppTestMessage(companyId: string, provider: string, recipientInput?: string) {
    const integration = await getCompanyIntegration(companyId, provider);
    if (!integration?.isActive) {
        return { ok: false, message: `${provider} integration is not active.` };
    }

    const recipients = recipientInput?.trim()
        ? [recipientInput.trim()]
        : await getWhatsAppReportRecipients(companyId);

    if (!recipients.length) {
        return {
            ok: false,
            message: 'No recipient found. Add a recipient in provider config JSON or pass a test recipient.'
        };
    }

    const recipient = recipients[0];
    const sent = await sendWhatsApp({
        to: recipient,
        companyId,
        message: `Integration test from IMS (${provider}) at ${new Date().toISOString()}`
    });

    if (!sent.success) {
        return {
            ok: false,
            message: sent.error || 'Failed to send test message',
            details: sent
        };
    }

    return {
        ok: true,
        message: `Test message sent to ${recipient}.`,
        details: sent
    };
}

export async function POST(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
            return createUnauthorized();
        }

        const companyId = user.companyId;
        if (!companyId) {
            return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
        }

        const body = await req.json();
        const provider = String(body?.provider || '').toUpperCase();
        const action = String(body?.action || 'test_connection').toLowerCase();
        const recipient = typeof body?.recipient === 'string' ? body.recipient : undefined;

        if (!provider) {
            return NextResponse.json({ error: 'Provider is required' }, { status: 400 });
        }

        let result: { ok: boolean; message: string; details?: unknown };
        const integration = await getCompanyIntegration(companyId, provider);

        if (action === 'send_test_message') {
            if (provider !== 'WHATSAPP_META' && provider !== 'WHATSAPP_TWILIO') {
                return NextResponse.json(
                    { error: 'Send test message is only supported for WhatsApp providers.' },
                    { status: 400 }
                );
            }
            result = await sendWhatsAppTestMessage(companyId, provider, recipient);
        } else {
            if (provider === 'WHATSAPP_TWILIO') {
                result = await testTwilioConnection(companyId);
            } else if (provider === 'WHATSAPP_META') {
                result = await testMetaConnection(companyId);
            } else if (provider === 'AWS_SES') {
                result = await testSesConnection(companyId);
            } else if (provider === 'GEMINI') {
                result = await testGeminiConnection(companyId);
            } else if (provider === 'PLAGIARISM_SCANNER') {
                result = await testPlagiarismWebhook(companyId);
            } else if (provider === 'RAZORPAY') {
                result = await testRazorpayConnection(companyId);
            } else {
                return NextResponse.json({ error: 'Test action is not implemented for this provider yet.' }, { status: 400 });
            }
        }

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'test',
                entity: 'integration',
                entityId: integration?.id || `${companyId}:${provider}`,
                changes: JSON.stringify({
                    action,
                    provider,
                    ok: result.ok,
                    message: result.message,
                    recipient: recipient || null,
                    details: result.details || null
                })
            }
        });

        return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    } catch (error: any) {
        console.error('Integration test error:', error);
        return NextResponse.json({ error: error.message || 'Failed to test integration' }, { status: 500 });
    }
}

// Style guide accessibility compliance helper comment: aria-label placeholder label
