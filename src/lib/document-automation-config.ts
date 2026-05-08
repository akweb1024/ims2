export type DocumentEntityType = "invoice" | "proforma";
export type DocumentEventType = "create" | "update";

export type MappingRule = {
  key: string;
  source?: string;
  value?: string | number | boolean | null;
};

export type WebhookRule = {
  id?: string;
  label?: string;
  enabled?: boolean;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  events?: string[];
  fieldTriggers?: string[];
  mappings?: MappingRule[];
  includeMeta?: boolean;
};

export type EmailRule = {
  id?: string;
  label?: string;
  enabled?: boolean;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  events?: string[];
  fieldTriggers?: string[];
  subject: string;
  body: string;
};

export type ScopedRuleMap<T> = Partial<Record<DocumentEntityType, T[]>>;

export const emptyWebhookConfig = (): ScopedRuleMap<WebhookRule> => ({
  invoice: [],
  proforma: [],
});

export const emptyEmailConfig = (): ScopedRuleMap<EmailRule> => ({
  invoice: [],
  proforma: [],
});

export function createEmptyWebhookRule(): WebhookRule {
  return {
    id: `webhook-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: "",
    enabled: true,
    url: "",
    method: "POST",
    events: ["create"],
    fieldTriggers: [],
    mappings: [{ key: "", source: "" }],
    includeMeta: true,
  };
}

export function createEmptyEmailRule(): EmailRule {
  return {
    id: `email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: "",
    enabled: true,
    to: "",
    cc: [],
    bcc: [],
    replyTo: "",
    events: ["create"],
    fieldTriggers: [],
    subject: "",
    body: "",
  };
}

export function normalizeScopedRuleMap<T>(value: unknown): ScopedRuleMap<T> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as ScopedRuleMap<T>;
  }
  const record = value as ScopedRuleMap<T>;
  return {
    invoice: Array.isArray(record.invoice) ? record.invoice : [],
    proforma: Array.isArray(record.proforma) ? record.proforma : [],
  };
}
