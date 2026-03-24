export const SUPPORTED_INTEGRATION_PROVIDERS = [
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
] as const;

export const SUPPORTED_INTEGRATION_PROVIDER_IDS =
  SUPPORTED_INTEGRATION_PROVIDERS.map((provider) => provider.id);

export const getSupportedIntegrationProvider = (providerId: string) =>
  SUPPORTED_INTEGRATION_PROVIDERS.find(
    (provider) => provider.id === providerId.toUpperCase(),
  );
