import { logger } from './logger';
// Reads CompanyIntegration with the provider secret in `key` decrypted; the local
// helper this replaced read it raw.
import { getCompanyIntegration } from '@/lib/integration-secrets';
interface WhatsAppMessage {
    to: string;
    message: string;
    mediaUrl?: string; // Optional image/PDF
    companyId?: string | null;
}

interface WhatsAppProviderConfig {
    provider: 'mock' | 'twilio' | 'meta';
    accountSid?: string;
    authToken?: string;
    from?: string;
    phoneNumberId?: string;
    accessToken?: string;
    apiVersion?: string;
    recipients?: string[];
}

function normalizeWhatsAppRecipient(phone: string) {
    const trimmed = phone.trim();
    if (trimmed.startsWith('whatsapp:')) return trimmed;
    const digits = trimmed.replace(/[^\d+]/g, '');
    return `whatsapp:${digits}`;
}

function normalizeMetaRecipient(phone: string) {
    const trimmed = phone.trim().replace(/^whatsapp:/i, '');
    return trimmed.replace(/[^\d]/g, '');
}

function parseRecipientList(input: unknown): string[] {
    if (Array.isArray(input)) {
        return input
            .map((item) => String(item || '').trim())
            .filter(Boolean);
    }

    if (typeof input === 'string') {
        return input
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
}

function dedupeRecipients(recipients: string[]) {
    return Array.from(new Set(recipients.map((item) => item.trim()).filter(Boolean)));
}

async function resolveWhatsAppProviderConfig(companyId?: string | null): Promise<WhatsAppProviderConfig> {
    if (companyId) {
        const metaIntegration = await getCompanyIntegration(companyId, 'WHATSAPP_META');
        if (metaIntegration?.isActive && metaIntegration.key) {
            let parsedValue: Record<string, unknown> = {};
            if (metaIntegration.value) {
                try {
                    parsedValue = JSON.parse(metaIntegration.value);
                } catch (error) {
                    logger.warn('WhatsApp Meta integration value is not valid JSON, falling back to env config', error as Error);
                }
            }

            const phoneNumberId = String(parsedValue.phoneNumberId || '').trim();
            if (phoneNumberId) {
                return {
                    provider: 'meta',
                    phoneNumberId,
                    accessToken: metaIntegration.key,
                    apiVersion: String(parsedValue.apiVersion || 'v22.0'),
                    recipients: dedupeRecipients(parseRecipientList(parsedValue.recipients))
                };
            }
        }

        const twilioIntegration = await getCompanyIntegration(companyId, 'WHATSAPP_TWILIO');
        if (twilioIntegration?.isActive && twilioIntegration.key) {
            let parsedValue: Record<string, unknown> = {};
            if (twilioIntegration.value) {
                try {
                    parsedValue = JSON.parse(twilioIntegration.value);
                } catch (error) {
                    logger.warn('WhatsApp integration value is not valid JSON, falling back to env config', error as Error);
                }
            }

            if (parsedValue.accountSid && parsedValue.from) {
                return {
                    provider: 'twilio',
                    accountSid: String(parsedValue.accountSid),
                    authToken: twilioIntegration.key,
                    from: String(parsedValue.from),
                    recipients: dedupeRecipients(parseRecipientList(parsedValue.recipients))
                };
            }
        }
    }

    if (
        process.env.WHATSAPP_PROVIDER === 'meta' &&
        process.env.WHATSAPP_META_PHONE_NUMBER_ID &&
        process.env.WHATSAPP_META_ACCESS_TOKEN
    ) {
        return {
            provider: 'meta',
            phoneNumberId: process.env.WHATSAPP_META_PHONE_NUMBER_ID,
            accessToken: process.env.WHATSAPP_META_ACCESS_TOKEN,
            apiVersion: process.env.WHATSAPP_META_API_VERSION || 'v22.0',
            recipients: dedupeRecipients(parseRecipientList(process.env.WHATSAPP_META_RECIPIENTS || process.env.WHATSAPP_REPORT_RECIPIENTS))
        };
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
            recipients: dedupeRecipients(parseRecipientList(process.env.WHATSAPP_REPORT_RECIPIENTS))
        };
    }

    return { provider: 'mock' };
}

export async function getWhatsAppReportRecipients(companyId?: string | null) {
    const providerConfig = await resolveWhatsAppProviderConfig(companyId);
    const fromConfig = dedupeRecipients(providerConfig.recipients || []);
    if (fromConfig.length > 0) return fromConfig;
    return dedupeRecipients(parseRecipientList(process.env.WHATSAPP_REPORT_RECIPIENTS || process.env.WHATSAPP_META_RECIPIENTS));
}

/**
 * Sends a WhatsApp message using company integration config or env fallback.
 * Falls back to mock mode when no valid provider is configured.
 */
export async function sendWhatsApp({ to, message, mediaUrl, companyId }: WhatsAppMessage) {
    const providerConfig = await resolveWhatsAppProviderConfig(companyId);

    if (providerConfig.provider === 'mock') {
        logger.info('Mock WhatsApp message', {
            to,
            companyId,
            hasMedia: Boolean(mediaUrl)
        });
        return { success: true, mode: 'mock', message: 'Mock WhatsApp logged' };
    }

    if (providerConfig.provider === 'meta' && providerConfig.phoneNumberId && providerConfig.accessToken) {
        try {
            const recipient = normalizeMetaRecipient(to);
            if (!recipient) {
                return { success: false, mode: 'meta', error: 'Invalid WhatsApp recipient number' };
            }

            const bodyText = mediaUrl ? `${message}\n\nAttachment: ${mediaUrl}` : message;
            const response = await fetch(`https://graph.facebook.com/${providerConfig.apiVersion || 'v22.0'}/${providerConfig.phoneNumberId}/messages`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${providerConfig.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: recipient,
                    type: 'text',
                    text: {
                        body: bodyText,
                        preview_url: false
                    }
                }),
            });

            const result = await response.json();
            if (!response.ok) {
                logger.error('Meta WhatsApp Error', new Error(result?.error?.message || 'Failed to send WhatsApp message via Meta'));
                return { success: false, mode: 'meta', error: result?.error?.message || 'Failed to send WhatsApp message via Meta' };
            }

            return {
                success: true,
                mode: 'meta',
                messageId: result?.messages?.[0]?.id
            };
        } catch (error) {
            logger.error('Meta WhatsApp Error', error as Error);
            return { success: false, mode: 'meta', error: error instanceof Error ? error.message : 'Unknown WhatsApp provider error' };
        }
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
                logger.error('Twilio WhatsApp Error', new Error(result?.message || 'Failed to send WhatsApp message'));
                return { success: false, mode: 'twilio', error: result?.message || 'Failed to send WhatsApp message' };
            }

            return {
                success: true,
                mode: 'twilio',
                sid: result.sid,
                status: result.status,
            };
        } catch (error) {
            logger.error('Twilio WhatsApp Error', error as Error);
            return { success: false, mode: 'twilio', error: error instanceof Error ? error.message : 'Unknown WhatsApp provider error' };
        }
    }

    return { success: false, error: 'Provider not configured' };
}
