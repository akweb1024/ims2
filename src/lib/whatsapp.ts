import { prisma } from './prisma';
interface WhatsAppMessage {
    to: string;
    message: string;
    mediaUrl?: string; // Optional image/PDF
    companyId?: string | null;
}

interface WhatsAppProviderConfig {
    provider: 'mock' | 'twilio';
    accountSid?: string;
    authToken?: string;
    from?: string;
}

function normalizeWhatsAppRecipient(phone: string) {
    const trimmed = phone.trim();
    if (trimmed.startsWith('whatsapp:')) return trimmed;
    const digits = trimmed.replace(/[^\d+]/g, '');
    return `whatsapp:${digits}`;
}

async function resolveWhatsAppProviderConfig(companyId?: string | null): Promise<WhatsAppProviderConfig> {
    if (companyId) {
        const integration = await (prisma as any).companyIntegration.findUnique({
            where: {
                companyId_provider: {
                    companyId,
                    provider: 'WHATSAPP_TWILIO'
                }
            }
        }).catch(() => null);

        if (integration?.isActive && integration.key) {
            let parsedValue: Record<string, string> = {};
            if (integration.value) {
                try {
                    parsedValue = JSON.parse(integration.value);
                } catch (error) {
                    console.warn('WhatsApp integration value is not valid JSON, falling back to env config');
                }
            }

            if (parsedValue.accountSid && parsedValue.from) {
                return {
                    provider: 'twilio',
                    accountSid: parsedValue.accountSid,
                    authToken: integration.key,
                    from: parsedValue.from
                };
            }
        }
    }

    if (
        process.env.WHATSAPP_PROVIDER === 'twilio' &&
        process.env.WHATSAPP_TWILIO_ACCOUNT_SID &&
        process.env.WHATSAPP_TWILIO_AUTH_TOKEN &&
        process.env.WHATSAPP_TWILIO_FROM
    ) {
        return {
            provider: 'twilio',
            accountSid: process.env.WHATSAPP_TWILIO_ACCOUNT_SID,
            authToken: process.env.WHATSAPP_TWILIO_AUTH_TOKEN,
            from: process.env.WHATSAPP_TWILIO_FROM,
        };
    }

    return { provider: 'mock' };
}

/**
 * Sends a WhatsApp message using company integration config or env fallback.
 * Falls back to mock mode when no valid provider is configured.
 */
export async function sendWhatsApp({ to, message, mediaUrl, companyId }: WhatsAppMessage) {
    const providerConfig = await resolveWhatsAppProviderConfig(companyId);

    if (providerConfig.provider === 'mock') {
        console.info('Mock WhatsApp message', {
            to,
            companyId,
            hasMedia: Boolean(mediaUrl)
        });
        return { success: true, mode: 'mock', message: 'Mock WhatsApp logged' };
    }

    if (providerConfig.provider === 'twilio' && providerConfig.accountSid && providerConfig.authToken && providerConfig.from) {
        try {
            const payload = new URLSearchParams({
                To: normalizeWhatsAppRecipient(to),
                From: providerConfig.from.startsWith('whatsapp:') ? providerConfig.from : `whatsapp:${providerConfig.from}`,
                Body: message,
            });

            if (mediaUrl) {
                payload.append('MediaUrl', mediaUrl);
            }

            const auth = Buffer.from(`${providerConfig.accountSid}:${providerConfig.authToken}`).toString('base64');
            const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${providerConfig.accountSid}/Messages.json`, {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: payload.toString(),
            });

            const result = await response.json();

            if (!response.ok) {
                console.error('Twilio WhatsApp Error:', result);
                return { success: false, mode: 'twilio', error: result?.message || 'Failed to send WhatsApp message' };
            }

            return {
                success: true,
                mode: 'twilio',
                sid: result.sid,
                status: result.status,
            };
        } catch (error) {
            console.error('Twilio WhatsApp Error:', error);
            return { success: false, mode: 'twilio', error: error instanceof Error ? error.message : 'Unknown WhatsApp provider error' };
        }
    }

    return { success: false, error: 'Provider not configured' };
}
