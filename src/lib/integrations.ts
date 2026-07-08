export const SUPPORTED_INTEGRATION_PROVIDERS = [
  {
    id: "RAZORPAY",
    name: "Razorpay Payments",
    desc: "Company-level Razorpay gateway credentials for payment tracking and reconciliation.",
    type: "Payments",
    valueLabel: "Provider Config JSON",
    valuePlaceholder: '{"keyId":"rzp_live_xxx","webhookSecret":"optional","accountLabel":"Main Account"}',
  },
  {
    id: "GEMINI",
    name: "Google Gemini AI",
    desc: "Used for intelligent Document OCR and chat.",
    type: "AI",
    valueLabel: "Provider Config",
    valuePlaceholder: "",
  },
  {
    id: "PLAGIARISM_SCANNER",
    name: "Turnitin / iThenticate",
    desc: "Used for scanning Journal Articles.",
    type: "Webhook",
    valueLabel: "Webhook Config",
    valuePlaceholder: "",
  },
  {
    id: "AWS_SES",
    name: "Amazon SES",
    desc: "Used for batch Marketing Campaigns.",
    type: "SMTP",
    valueLabel: "Sender Identity (Email Endpoint)",
    valuePlaceholder: "noreply@stm.com",
  },
  {
    id: "WHATSAPP_TWILIO",
    name: "WhatsApp via Twilio",
    desc: "Used for operational and HR WhatsApp notifications.",
    type: "Messaging",
    valueLabel: "Provider Config JSON",
    valuePlaceholder: '{"accountSid":"AC...","from":"whatsapp:+14155238886"}',
  },
  {
    id: "WHATSAPP_META",
    name: "WhatsApp via Meta Cloud API",
    desc: "Used for operational and HR WhatsApp notifications without Twilio.",
    type: "Messaging",
    valueLabel: "Provider Config JSON",
    valuePlaceholder: '{"phoneNumberId":"1234567890","apiVersion":"v22.0","recipients":["+9198xxxxxx01","+9198xxxxxx02"]}',
  },
] as const;

export const SUPPORTED_INTEGRATION_PROVIDER_IDS =
  SUPPORTED_INTEGRATION_PROVIDERS.map((provider) => provider.id);

export const getSupportedIntegrationProvider = (providerId: string) =>
  SUPPORTED_INTEGRATION_PROVIDERS.find(
    (provider) => provider.id === providerId.toUpperCase(),
  );

/**
 * Resolves which company's integrations a request may act on. Defaults to the caller's own
 * company; a SUPER_ADMIN may target any other company by id (e.g. configuring Razorpay for a
 * specific company from its Companies-page settings tab, the same way Brands already work).
 * Returns null if the caller isn't allowed to touch the requested company.
 */
export function resolveTargetCompanyId(
  user: { role: string; companyId?: string | null },
  requestedCompanyId?: string | null,
): string | null {
  if (!requestedCompanyId) return user.companyId ?? null;
  if (user.role === 'SUPER_ADMIN') return requestedCompanyId;
  return requestedCompanyId === user.companyId ? user.companyId! : null;
}
