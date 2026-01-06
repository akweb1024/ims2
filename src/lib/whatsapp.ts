
interface WhatsAppMessage {
    to: string;
    message: string;
    mediaUrl?: string; // Optional image/PDF
}

/**
 * Sends a WhatsApp message using a provider (e.g., Twilio, Meta Business API).
 * Currently mocks the functionality if credentials are missing.
 */
export async function sendWhatsApp({ to, message, mediaUrl }: WhatsAppMessage) {
    // 1. Check for credentials (Example: Twilio or Meta)
    const WHATSAPP_PROVIDER = process.env.WHATSAPP_PROVIDER || 'mock'; // 'twilio', 'meta', 'mock'

    if (WHATSAPP_PROVIDER === 'mock') {
        console.log('-------------------------------------------');
        console.log('📱 MOCK WHATSAPP SENT');
        console.log(`To: ${to}`);
        console.log(`Message: ${message}`);
        if (mediaUrl) console.log(`Media: ${mediaUrl}`);
        console.log('-------------------------------------------');
        return { success: true, message: 'Mock WhatsApp logged' };
    }

    // Example Implementation for Twilio (Commented out for future enablement)
    /*
    if (WHATSAPP_PROVIDER === 'twilio') {
        const client = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
        try {
            await client.messages.create({
                body: message,
                from: `whatsapp:${process.env.TWILIO_FROM}`,
                to: `whatsapp:${to}`,
                mediaUrl: mediaUrl ? [mediaUrl] : undefined
            });
            return { success: true };
        } catch (error) {
            console.error('Twilio WhatsApp Error:', error);
            return { success: false, error };
        }
    }
    */

    return { success: false, error: 'Provider not configured' };
}
