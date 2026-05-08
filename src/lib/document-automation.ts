import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import {
  getAutomationFormsConfig,
  type AutomationFormAction,
  type AutomationFormKey,
} from "@/lib/automation-forms";
import {
  type DocumentEntityType,
  type DocumentEventType,
  type EmailRule,
  type ScopedRuleMap,
  type WebhookRule,
} from "@/lib/document-automation-config";

type JsonRecord = Record<string, any>;

const EVENT_TYPES: DocumentEventType[] = ["create", "update"];

function normalizeJsonRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as JsonRecord;
}

function getScopedRules<T>(config: unknown, entityType: DocumentEntityType): T[] {
  const normalized = normalizeJsonRecord(config) as ScopedRuleMap<T>;
  const rules = normalized[entityType];
  return Array.isArray(rules) ? rules : [];
}

function shouldRunRule(
  rule: { enabled?: boolean; events?: string[]; fieldTriggers?: string[] },
  eventType: DocumentEventType,
  changedFields: string[],
) {
  if (rule.enabled === false) return false;
  const events = Array.isArray(rule.events) && rule.events.length > 0
    ? rule.events.map((event) => String(event).toLowerCase()).filter((event): event is DocumentEventType => EVENT_TYPES.includes(event as DocumentEventType))
    : ["create"];
  if (!events.includes(eventType)) return false;
  if (eventType === "update" && Array.isArray(rule.fieldTriggers) && rule.fieldTriggers.length > 0) {
    const changed = new Set(changedFields.map((field) => field.toLowerCase()));
    return rule.fieldTriggers.some((field) => changed.has(String(field).toLowerCase()));
  }
  return true;
}

function getValueAtPath(source: unknown, path?: string) {
  if (!path) return null;
  return path.split(".").reduce<any>((current, key) => {
    if (current === null || current === undefined) return null;
    return current[key];
  }, source);
}

function renderTemplate(template: string, payload: JsonRecord) {
  return String(template || "").replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, token: string) => {
    const value = getValueAtPath(payload, token.trim());
    return value === null || value === undefined ? "" : String(value);
  });
}

function normalizeAddressList(
  input: string | string[] | undefined,
  payload: JsonRecord,
): string[] {
  const values = Array.isArray(input) ? input : input ? [input] : [];
  return values
    .map((value) => {
      const raw = String(value || "").trim();
      if (!raw) return "";
      if (raw.includes("{{")) return renderTemplate(raw, payload).trim();
      if (raw.includes("@")) return raw;
      const resolved = getValueAtPath(payload, raw);
      return resolved === null || resolved === undefined ? "" : String(resolved).trim();
    })
    .filter(Boolean);
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function buildWebhookBody(rule: WebhookRule, payload: JsonRecord, meta: JsonRecord) {
  const mappings = Array.isArray(rule.mappings) ? rule.mappings : [];
  const mappedData = mappings.length > 0
    ? Object.fromEntries(
        mappings
          .filter((mapping) => mapping && mapping.key)
          .map((mapping) => [
            mapping.key,
            mapping.source
              ? mapping.source.includes("{{")
                ? renderTemplate(mapping.source, { ...payload, meta })
                : getValueAtPath(payload, mapping.source)
              : mapping.value ?? null,
          ]),
      )
    : payload;

  if (rule.includeMeta === false) return mappedData;
  return {
    meta,
    data: mappedData,
  };
}

async function sendWebhookRule(rule: WebhookRule, payload: JsonRecord, meta: JsonRecord) {
  const headers = {
    "Content-Type": "application/json",
    ...(rule.headers || {}),
  };
  const response = await fetch(rule.url, {
    method: (rule.method || "POST").toUpperCase(),
    headers,
    body: JSON.stringify(buildWebhookBody(rule, payload, meta)),
  });
  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    throw new Error(`Webhook failed with ${response.status}${responseText ? `: ${responseText.slice(0, 300)}` : ""}`);
  }
}

async function sendEmailRule(rule: EmailRule, payload: JsonRecord) {
  const to = normalizeAddressList(rule.to, payload);
  if (to.length === 0) {
    throw new Error("Email rule resolved to no recipients");
  }
  const cc = normalizeAddressList(rule.cc, payload);
  const bcc = normalizeAddressList(rule.bcc, payload);
  const replyTo = rule.replyTo ? renderTemplate(rule.replyTo, payload).trim() : undefined;
  const subject = renderTemplate(rule.subject, payload);
  const html = renderTemplate(rule.body, payload);
  await sendEmail({
    to: to.join(", "),
    cc: cc.length ? cc.join(", ") : undefined,
    bcc: bcc.length ? bcc.join(", ") : undefined,
    replyTo: replyTo || undefined,
    subject,
    html,
    text: stripHtml(html),
  });
}

function shouldRunGenericAction(action: AutomationFormAction, eventType: DocumentEventType, changedFields: string[]) {
  if (action.enabled === false) return false;
  const events = Array.isArray(action.triggerEvents) && action.triggerEvents.length > 0
    ? action.triggerEvents
    : ["create"];
  if (!events.includes(eventType)) return false;
  if (eventType === "update" && Array.isArray(action.changedFields) && action.changedFields.length > 0) {
    const changed = new Set(changedFields.map((field) => field.toLowerCase()));
    return action.changedFields.some((field) => changed.has(String(field).toLowerCase()));
  }
  return true;
}

function buildMappedPayload(action: AutomationFormAction, payload: JsonRecord, meta: JsonRecord) {
  const mappings = Array.isArray(action.mappings) ? action.mappings : [];
  const data = mappings.length > 0
    ? Object.fromEntries(
        mappings
          .filter((row) => row?.key)
          .map((row) => [
            row.key,
            row.sourcePath
              ? row.sourcePath.includes("{{")
                ? renderTemplate(row.sourcePath, { ...payload, meta })
                : getValueAtPath(payload, row.sourcePath)
              : row.staticValue ?? null,
          ]),
      )
    : payload;
  return action.includeMeta === false ? data : { meta, data };
}

async function sendWebhookAction(action: AutomationFormAction, payload: JsonRecord, meta: JsonRecord) {
  if (!action.endpointUrl) return;
  const response = await fetch(action.endpointUrl, {
    method: (action.method || "POST").toUpperCase(),
    headers: {
      "Content-Type": "application/json",
      ...(action.headers || {}),
    },
    body: JSON.stringify(buildMappedPayload(action, payload, meta)),
  });
  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    throw new Error(`Webhook failed with ${response.status}${responseText ? `: ${responseText.slice(0, 300)}` : ""}`);
  }
}

async function sendEmailAction(action: AutomationFormAction, payload: JsonRecord) {
  const to = normalizeAddressList(action.to || [], payload);
  if (to.length === 0) throw new Error("Email action resolved to no recipients");
  const cc = normalizeAddressList(action.cc || [], payload);
  const bcc = normalizeAddressList(action.bcc || [], payload);
  const replyTo = action.replyTo ? renderTemplate(action.replyTo, payload).trim() : undefined;
  const subject = renderTemplate(action.subject || "", payload);
  const html = renderTemplate(action.body || "", payload);
  await sendEmail({
    to: to.join(", "),
    cc: cc.length ? cc.join(", ") : undefined,
    bcc: bcc.length ? bcc.join(", ") : undefined,
    replyTo: replyTo || undefined,
    subject,
    html,
    text: stripHtml(html),
  });
}

async function createInternalTaskAction(
  action: AutomationFormAction,
  payload: JsonRecord,
  meta: JsonRecord,
) {
  const customerProfileId = payload?.customer?.id;
  if (!customerProfileId) {
    throw new Error("INTERNAL_TASK requires payload.customer.id");
  }

  const subjectTemplate = action.name || action.taskTemplate || `${meta.entityType} follow-up`;
  const notesTemplate = action.taskTemplate || `Automation follow-up for ${meta.entityType}`;
  const subject = renderTemplate(subjectTemplate, payload).trim().slice(0, 300) || `${meta.entityType} follow-up`;
  const notes = renderTemplate(notesTemplate, payload).trim() || "Automation follow-up";
  const referenceId = payload?.invoice?.id || payload?.proforma?.id || null;

  await prisma.communicationLog.create({
    data: {
      customerProfileId,
      companyId: meta.companyId || undefined,
      userId: undefined,
      channel: "INTERNAL_TASK",
      subject,
      notes,
      category: "AUTOMATION_INTERNAL_TASK",
      referenceId,
      type: "COMMENT",
      isFollowUpCompleted: false,
      date: new Date(),
    },
  });
}

function resolveRedirectActionUrl(action: AutomationFormAction, payload: JsonRecord) {
  if (action.type !== "REDIRECT" || !action.redirectUrl) return null;
  const url = renderTemplate(action.redirectUrl, payload).trim();
  return url || null;
}

export async function resolveDocumentRedirect({
  entityType,
  eventType,
  changedFields = [],
  payload,
}: {
  entityType: DocumentEntityType;
  eventType: DocumentEventType;
  changedFields?: string[];
  payload: JsonRecord;
}) {
  const companyId = payload?.company?.id;
  if (!companyId) return null;
  const config = await getAutomationFormsConfig(companyId);
  const actions = config.forms?.[entityType as AutomationFormKey]?.actions || [];
  for (const action of actions) {
    if (!action || action.type !== "REDIRECT") continue;
    if (!shouldRunGenericAction(action, eventType, changedFields)) continue;
    const url = resolveRedirectActionUrl(action, payload);
    if (url) {
      return {
        actionId: action.id,
        actionName: action.name,
        redirectUrl: url,
      };
    }
  }
  return null;
}

export function parseAutomationConfigInput(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return JSON.parse(trimmed);
  }
  if (typeof value === "object") return value;
  return null;
}

export async function loadInvoiceAutomationPayload(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      customerProfile: true,
      company: true,
      brand: true,
      subscription: {
        include: {
          customerProfile: true,
        },
      },
    },
  });
  if (!invoice) return null;
  const customer = invoice.customerProfile || invoice.subscription?.customerProfile || null;
  return {
    invoice,
    customer,
    company: invoice.company,
    brand: invoice.brand,
  };
}

export async function loadProformaAutomationPayload(proformaId: string) {
  const proforma = await prisma.proformaInvoice.findUnique({
    where: { id: proformaId },
    include: {
      customerProfile: true,
    },
  });
  if (!proforma) return null;
  const [company, brand] = await Promise.all([
    proforma.companyId
      ? prisma.company.findUnique({ where: { id: proforma.companyId } })
      : Promise.resolve(null),
    proforma.brandId
      ? prisma.brand.findUnique({ where: { id: proforma.brandId } })
      : Promise.resolve(null),
  ]);
  return {
    proforma,
    customer: proforma.customerProfile,
    company,
    brand,
  };
}

export async function triggerDocumentAutomation({
  entityType,
  eventType,
  changedFields = [],
  payload,
}: {
  entityType: DocumentEntityType;
  eventType: DocumentEventType;
  changedFields?: string[];
  payload: JsonRecord;
}) {
  const company = payload.company || null;
  const brand = payload.brand || null;
  const formKey = entityType as AutomationFormKey;
  const actionsFromForms = company?.id
    ? (await getAutomationFormsConfig(company.id)).forms?.[formKey]?.actions || []
    : [];

  const meta = {
    entityType,
    eventType,
    changedFields,
    companyId: company?.id || null,
    brandId: brand?.id || null,
    triggeredAt: new Date().toISOString(),
  };

  for (const action of actionsFromForms) {
    if (!action || !shouldRunGenericAction(action, eventType, changedFields)) continue;
    try {
      if (action.type === "WEBHOOK") {
        await sendWebhookAction(action, payload, meta);
      } else if (action.type === "EMAIL") {
        await sendEmailAction(action, payload);
      } else if (action.type === "INTERNAL_TASK") {
        await createInternalTaskAction(action, payload, meta);
      }
    } catch (error) {
      logger.error("Document automation form action failed", error, {
        entityType,
        eventType,
        actionId: action.id,
        actionType: action.type,
        companyId: company?.id,
      });
    }
  }

  const webhookRules = [
    ...getScopedRules<WebhookRule>(company?.documentWebhookConfig, entityType),
    ...getScopedRules<WebhookRule>(brand?.documentWebhookConfig, entityType),
  ];
  const emailRules = [
    ...getScopedRules<EmailRule>(company?.documentEmailConfig, entityType),
    ...getScopedRules<EmailRule>(brand?.documentEmailConfig, entityType),
  ];

  for (const rule of webhookRules) {
    if (!rule?.url || !shouldRunRule(rule, eventType, changedFields)) continue;
    try {
      await sendWebhookRule(rule, payload, meta);
    } catch (error) {
      logger.error("Document automation webhook failed", error, {
        entityType,
        eventType,
        ruleId: rule.id || rule.label || rule.url,
        companyId: company?.id,
        brandId: brand?.id,
      });
    }
  }

  for (const rule of emailRules) {
    if (!rule?.subject || !rule?.body || !rule?.to || !shouldRunRule(rule, eventType, changedFields)) continue;
    try {
      await sendEmailRule(rule, payload);
    } catch (error) {
      logger.error("Document automation email failed", error, {
        entityType,
        eventType,
        ruleId: rule.id || rule.label || "email-rule",
        companyId: company?.id,
        brandId: brand?.id,
      });
    }
  }
}
