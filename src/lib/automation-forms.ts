import { prisma } from "@/lib/prisma";

export type AutomationFormKey = "invoice" | "proforma";
export type AutomationActionType = "WEBHOOK" | "EMAIL" | "REDIRECT" | "INTERNAL_TASK";
export type AutomationTriggerEvent = "create" | "update";

export type AutomationMappingRow = {
  key: string;
  sourcePath?: string;
  staticValue?: string;
};

export type AutomationFormAction = {
  id: string;
  name: string;
  type: AutomationActionType;
  enabled: boolean;
  triggerEvents: AutomationTriggerEvent[];
  changedFields?: string[];
  method?: "POST" | "PUT" | "PATCH";
  endpointUrl?: string;
  headers?: Record<string, string>;
  includeMeta?: boolean;
  mappings?: AutomationMappingRow[];
  to?: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  subject?: string;
  body?: string;
  redirectUrl?: string;
  taskTemplate?: string;
};

export type AutomationFormsConfig = {
  version: number;
  forms: Record<AutomationFormKey, { actions: AutomationFormAction[] }>;
};

export const AUTOMATION_FORMS_CATEGORY = "AUTOMATION_FORMS";
export const AUTOMATION_FORMS_KEY = "FORMS_CONFIG";

export const AUTOMATION_FORM_DEFINITIONS: Array<{
  key: AutomationFormKey;
  name: string;
  description: string;
}> = [
  {
    key: "invoice",
    name: "Invoice Creation",
    description: "Outbound automation for invoice create/update events.",
  },
  {
    key: "proforma",
    name: "Proforma Creation",
    description: "Outbound automation for proforma create/update events.",
  },
];

export const AUTOMATION_ACTION_CATALOG: Array<{
  type: AutomationActionType;
  name: string;
  description: string;
}> = [
  { type: "WEBHOOK", name: "Webhook", description: "Send mapped payload to an external URL." },
  { type: "EMAIL", name: "Email", description: "Send customizable email notifications." },
  { type: "REDIRECT", name: "Redirect", description: "Save redirect target for downstream handlers." },
  { type: "INTERNAL_TASK", name: "Internal Task", description: "Create internal follow-up workflow entries." },
];

export const AUTOMATION_FIELD_CATALOG: Record<
  AutomationFormKey,
  Array<{ key: string; label: string }>
> = {
  invoice: [
    { key: "invoice.id", label: "Invoice ID" },
    { key: "invoice.invoiceNumber", label: "Invoice Number" },
    { key: "invoice.proformaNumber", label: "Proforma Number" },
    { key: "invoice.status", label: "Invoice Status" },
    { key: "invoice.total", label: "Invoice Total" },
    { key: "invoice.amount", label: "Subtotal Amount" },
    { key: "invoice.tax", label: "Tax Amount" },
    { key: "invoice.currency", label: "Currency" },
    { key: "customer.id", label: "Customer ID" },
    { key: "customer.name", label: "Customer Name" },
    { key: "customer.organizationName", label: "Customer Organization" },
    { key: "customer.primaryEmail", label: "Customer Email" },
    { key: "customer.primaryPhone", label: "Customer Phone" },
    { key: "company.id", label: "Company ID" },
    { key: "company.name", label: "Company Name" },
    { key: "company.email", label: "Company Email" },
    { key: "brand.id", label: "Brand ID" },
    { key: "brand.name", label: "Brand Name" },
  ],
  proforma: [
    { key: "proforma.id", label: "Proforma ID" },
    { key: "proforma.proformaNumber", label: "Proforma Number" },
    { key: "proforma.status", label: "Proforma Status" },
    { key: "proforma.total", label: "Proforma Total" },
    { key: "proforma.subtotal", label: "Subtotal Amount" },
    { key: "proforma.taxAmount", label: "Tax Amount" },
    { key: "proforma.currency", label: "Currency" },
    { key: "customer.id", label: "Customer ID" },
    { key: "customer.name", label: "Customer Name" },
    { key: "customer.organizationName", label: "Customer Organization" },
    { key: "customer.primaryEmail", label: "Customer Email" },
    { key: "customer.primaryPhone", label: "Customer Phone" },
    { key: "company.id", label: "Company ID" },
    { key: "company.name", label: "Company Name" },
    { key: "company.email", label: "Company Email" },
    { key: "brand.id", label: "Brand ID" },
    { key: "brand.name", label: "Brand Name" },
  ],
};

export function emptyAutomationFormsConfig(): AutomationFormsConfig {
  return {
    version: 1,
    forms: {
      invoice: { actions: [] },
      proforma: { actions: [] },
    },
  };
}

function isObjectRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function normalizeAutomationFormsConfig(value: unknown): AutomationFormsConfig {
  const fallback = emptyAutomationFormsConfig();
  if (!isObjectRecord(value)) return fallback;
  const forms = isObjectRecord(value.forms) ? value.forms : {};
  const invoiceActions = Array.isArray(forms.invoice?.actions) ? forms.invoice.actions : [];
  const proformaActions = Array.isArray(forms.proforma?.actions) ? forms.proforma.actions : [];
  return {
    version: Number(value.version) || 1,
    forms: {
      invoice: { actions: invoiceActions },
      proforma: { actions: proformaActions },
    },
  };
}

export async function getAutomationFormsConfig(companyId: string) {
  const row = await prisma.appConfiguration.findUnique({
    where: {
      companyId_category_key: {
        companyId,
        category: AUTOMATION_FORMS_CATEGORY,
        key: AUTOMATION_FORMS_KEY,
      },
    },
  });
  if (!row?.value) return emptyAutomationFormsConfig();
  try {
    return normalizeAutomationFormsConfig(JSON.parse(row.value));
  } catch {
    return emptyAutomationFormsConfig();
  }
}

export async function saveAutomationFormsConfig(companyId: string, config: AutomationFormsConfig, userId?: string) {
  const normalized = normalizeAutomationFormsConfig(config);
  return prisma.appConfiguration.upsert({
    where: {
      companyId_category_key: {
        companyId,
        category: AUTOMATION_FORMS_CATEGORY,
        key: AUTOMATION_FORMS_KEY,
      },
    },
    create: {
      companyId,
      category: AUTOMATION_FORMS_CATEGORY,
      key: AUTOMATION_FORMS_KEY,
      value: JSON.stringify(normalized),
      description: "Configurable outbound automation forms",
      createdBy: userId,
      isActive: true,
    },
    update: {
      value: JSON.stringify(normalized),
      isActive: true,
    },
  });
}
