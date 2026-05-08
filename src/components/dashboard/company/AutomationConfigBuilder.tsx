"use client";

import {
  createEmptyEmailRule,
  createEmptyWebhookRule,
  type DocumentEntityType,
  type EmailRule,
  type MappingRule,
  type ScopedRuleMap,
  type WebhookRule,
} from "@/lib/document-automation-config";

type BuilderMode = "webhook" | "email";

type Props = {
  mode: BuilderMode;
  title: string;
  hint: string;
  value: ScopedRuleMap<WebhookRule> | ScopedRuleMap<EmailRule>;
  onChange: (next: any) => void;
};

const ENTITY_TYPES: DocumentEntityType[] = ["invoice", "proforma"];
const EVENT_OPTIONS = [
  { value: "create", label: "Created" },
  { value: "update", label: "Updated" },
];
const METHOD_OPTIONS = ["POST", "PUT", "PATCH"];

function prettifyEntity(entityType: DocumentEntityType) {
  return entityType === "invoice" ? "Invoice" : "Proforma";
}

function updateRuleList<T>(
  config: ScopedRuleMap<T>,
  entityType: DocumentEntityType,
  updater: (rules: T[]) => T[],
) {
  return {
    ...config,
    [entityType]: updater(Array.isArray(config[entityType]) ? [...(config[entityType] as T[])] : []),
  };
}

function parseCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatArray(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value.join(", ");
  return value || "";
}

export default function AutomationConfigBuilder({
  mode,
  title,
  hint,
  value,
  onChange,
}: Props) {
  const config = value as any;

  const addRule = (entityType: DocumentEntityType) => {
    onChange(
      updateRuleList(config, entityType, (rules) => [
        ...rules,
        mode === "webhook" ? createEmptyWebhookRule() : createEmptyEmailRule(),
      ]),
    );
  };

  const removeRule = (entityType: DocumentEntityType, index: number) => {
    onChange(
      updateRuleList(config, entityType, (rules) =>
        rules.filter((_: any, ruleIndex: number) => ruleIndex !== index),
      ),
    );
  };

  const updateRule = (
    entityType: DocumentEntityType,
    index: number,
    patch: Partial<WebhookRule & EmailRule>,
  ) => {
    onChange(
      updateRuleList(config, entityType, (rules) =>
        rules.map((rule: any, ruleIndex: number) =>
          ruleIndex === index ? { ...rule, ...patch } : rule,
        ),
      ),
    );
  };

  const updateMapping = (
    entityType: DocumentEntityType,
    ruleIndex: number,
    mappingIndex: number,
    patch: Partial<MappingRule>,
  ) => {
    onChange(
      updateRuleList(config, entityType, (rules) =>
        rules.map((rule: any, currentRuleIndex: number) => {
          if (currentRuleIndex !== ruleIndex) return rule;
          const mappings = Array.isArray(rule.mappings) ? [...rule.mappings] : [];
          mappings[mappingIndex] = { ...mappings[mappingIndex], ...patch };
          return { ...rule, mappings };
        }),
      ),
    );
  };

  const addMapping = (entityType: DocumentEntityType, ruleIndex: number) => {
    onChange(
      updateRuleList(config, entityType, (rules) =>
        rules.map((rule: any, currentRuleIndex: number) =>
          currentRuleIndex === ruleIndex
            ? {
                ...rule,
                mappings: [...(Array.isArray(rule.mappings) ? rule.mappings : []), { key: "", source: "" }],
              }
            : rule,
        ),
      ),
    );
  };

  const removeMapping = (entityType: DocumentEntityType, ruleIndex: number, mappingIndex: number) => {
    onChange(
      updateRuleList(config, entityType, (rules) =>
        rules.map((rule: any, currentRuleIndex: number) =>
          currentRuleIndex === ruleIndex
            ? {
                ...rule,
                mappings: (Array.isArray(rule.mappings) ? rule.mappings : []).filter(
                  (_: any, currentMappingIndex: number) => currentMappingIndex !== mappingIndex,
                ),
              }
            : rule,
        ),
      ),
    );
  };

  return (
    <div className="rounded-3xl border border-emerald-100/60 bg-white/80 p-6">
      <div className="mb-6">
        <h5 className="text-lg font-black text-secondary-900">{title}</h5>
        <p className="mt-1 text-sm text-secondary-600">{hint}</p>
        <p className="mt-2 text-xs text-secondary-500">
          Common source paths: `invoice.invoiceNumber`, `invoice.total`, `proforma.proformaNumber`, `customer.name`,
          `customer.primaryEmail`, `company.name`, `brand.name`
        </p>
      </div>

      <div className="space-y-6">
        {ENTITY_TYPES.map((entityType) => {
          const rules = Array.isArray(config[entityType]) ? config[entityType] : [];
          return (
            <div key={entityType} className="rounded-2xl border border-secondary-100 bg-secondary-50/60 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h6 className="font-bold text-secondary-900">{prettifyEntity(entityType)} Rules</h6>
                  <p className="text-xs text-secondary-500">
                    {mode === "webhook" ? "Send mapped payloads to an external API." : "Send custom document emails."}
                  </p>
                </div>
                <button type="button" onClick={() => addRule(entityType)} className="btn btn-secondary text-xs">
                  + Add Rule
                </button>
              </div>

              <div className="space-y-4">
                {rules.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-secondary-200 bg-white px-4 py-5 text-sm text-secondary-500">
                    No {entityType} {mode} rules yet.
                  </div>
                ) : (
                  rules.map((rule: any, index: number) => (
                    <div key={rule.id || `${entityType}-${index}`} className="rounded-2xl border border-secondary-200 bg-white p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <input
                          className="input-premium flex-1 bg-white"
                          value={rule.label || ""}
                          onChange={(e) => updateRule(entityType, index, { label: e.target.value })}
                          placeholder={`${prettifyEntity(entityType)} ${mode} rule name`}
                        />
                        <label className="flex items-center gap-2 text-xs font-bold text-secondary-600">
                          <input
                            type="checkbox"
                            checked={rule.enabled !== false}
                            onChange={(e) => updateRule(entityType, index, { enabled: e.target.checked })}
                          />
                          Enabled
                        </label>
                        <button
                          type="button"
                          onClick={() => removeRule(entityType, index)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {mode === "webhook" ? (
                          <>
                            <input
                              className="input-premium bg-white md:col-span-2"
                              value={rule.url || ""}
                              onChange={(e) => updateRule(entityType, index, { url: e.target.value })}
                              placeholder="Notification URL"
                            />
                            <select
                              className="input-premium bg-white"
                              value={rule.method || "POST"}
                              onChange={(e) => updateRule(entityType, index, { method: e.target.value })}
                            >
                              {METHOD_OPTIONS.map((method) => (
                                <option key={method} value={method}>
                                  {method}
                                </option>
                              ))}
                            </select>
                            <label className="flex items-center gap-2 rounded-2xl border border-secondary-200 bg-white px-4 py-3 text-sm text-secondary-700">
                              <input
                                type="checkbox"
                                checked={rule.includeMeta !== false}
                                onChange={(e) => updateRule(entityType, index, { includeMeta: e.target.checked })}
                              />
                              Include meta wrapper (`meta` + `data`)
                            </label>
                          </>
                        ) : (
                          <>
                            <input
                              className="input-premium bg-white"
                              value={formatArray(rule.to)}
                              onChange={(e) => updateRule(entityType, index, { to: parseCsv(e.target.value) })}
                              placeholder="To: customer.primaryEmail"
                            />
                            <input
                              className="input-premium bg-white"
                              value={formatArray(rule.cc)}
                              onChange={(e) => updateRule(entityType, index, { cc: parseCsv(e.target.value) })}
                              placeholder="CC: brand.email"
                            />
                            <input
                              className="input-premium bg-white"
                              value={formatArray(rule.bcc)}
                              onChange={(e) => updateRule(entityType, index, { bcc: parseCsv(e.target.value) })}
                              placeholder="BCC"
                            />
                            <input
                              className="input-premium bg-white"
                              value={rule.replyTo || ""}
                              onChange={(e) => updateRule(entityType, index, { replyTo: e.target.value })}
                              placeholder="Reply-to"
                            />
                            <input
                              className="input-premium bg-white md:col-span-2"
                              value={rule.subject || ""}
                              onChange={(e) => updateRule(entityType, index, { subject: e.target.value })}
                              placeholder="Subject with placeholders"
                            />
                            <textarea
                              className="input-premium min-h-[120px] bg-white md:col-span-2"
                              value={rule.body || ""}
                              onChange={(e) => updateRule(entityType, index, { body: e.target.value })}
                              placeholder="HTML email body"
                            />
                          </>
                        )}

                        <div className="rounded-2xl border border-secondary-200 bg-white p-4 md:col-span-2">
                          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-secondary-500">Trigger When</p>
                          <div className="flex flex-wrap gap-4">
                            {EVENT_OPTIONS.map((eventOption) => {
                              const selectedEvents = Array.isArray(rule.events) ? rule.events : [];
                              const isChecked = selectedEvents.includes(eventOption.value);
                              return (
                                <label key={eventOption.value} className="flex items-center gap-2 text-sm text-secondary-700">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const nextEvents = e.target.checked
                                        ? [...selectedEvents, eventOption.value]
                                        : selectedEvents.filter((event: string) => event !== eventOption.value);
                                      updateRule(entityType, index, { events: nextEvents });
                                    }}
                                  />
                                  {eventOption.label}
                                </label>
                              );
                            })}
                          </div>
                          <input
                            className="input-premium mt-3 bg-white"
                            value={(Array.isArray(rule.fieldTriggers) ? rule.fieldTriggers : []).join(", ")}
                            onChange={(e) => updateRule(entityType, index, { fieldTriggers: parseCsv(e.target.value) })}
                            placeholder="Optional: specific changed fields, e.g. status,total"
                          />
                        </div>

                        {mode === "webhook" ? (
                          <div className="rounded-2xl border border-secondary-200 bg-white p-4 md:col-span-2">
                            <div className="mb-3 flex items-center justify-between">
                              <p className="text-xs font-bold uppercase tracking-wide text-secondary-500">Map Data</p>
                              <button
                                type="button"
                                onClick={() => addMapping(entityType, index)}
                                className="text-xs font-bold text-primary-600"
                              >
                                + Add Row
                              </button>
                            </div>
                            <div className="space-y-3">
                              {(Array.isArray(rule.mappings) ? rule.mappings : []).map((mapping: MappingRule, mappingIndex: number) => (
                                <div key={`${rule.id || index}-map-${mappingIndex}`} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
                                  <input
                                    className="input-premium bg-white"
                                    value={mapping.key || ""}
                                    onChange={(e) => updateMapping(entityType, index, mappingIndex, { key: e.target.value })}
                                    placeholder="Outgoing key"
                                  />
                                  <input
                                    className="input-premium bg-white"
                                    value={mapping.source || String(mapping.value || "")}
                                    onChange={(e) =>
                                      updateMapping(entityType, index, mappingIndex, {
                                        source: e.target.value,
                                        value: undefined,
                                      })
                                    }
                                    placeholder="Source path or fixed value"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeMapping(entityType, index, mappingIndex)}
                                    className="rounded-lg border border-secondary-200 px-3 py-2 text-xs font-bold text-secondary-500"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
