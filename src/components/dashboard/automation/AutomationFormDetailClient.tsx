"use client";

import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

type FormKey = "invoice" | "proforma";
type ActionType = "WEBHOOK" | "EMAIL" | "REDIRECT" | "INTERNAL_TASK";
type TriggerEvent = "create" | "update";

type MappingRow = { key: string; sourcePath?: string; staticValue?: string };
type FormAction = {
  id: string;
  name: string;
  type: ActionType;
  enabled: boolean;
  triggerEvents: TriggerEvent[];
  changedFields?: string[];
  method?: "POST" | "PUT" | "PATCH";
  endpointUrl?: string;
  headers?: Record<string, string>;
  includeMeta?: boolean;
  mappings?: MappingRow[];
  to?: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  subject?: string;
  body?: string;
  redirectUrl?: string;
  taskTemplate?: string;
};

type ApiConfig = {
  forms: Record<FormKey, { actions: FormAction[] }>;
  version: number;
};

type FieldCatalog = Record<FormKey, Array<{ key: string; label: string }>>;

const EVENT_OPTIONS: TriggerEvent[] = ["create", "update"];

function createEmptyAction(type: ActionType): FormAction {
  return {
    id: `${type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: "",
    type,
    enabled: true,
    triggerEvents: ["create"],
    method: "POST",
    includeMeta: true,
    mappings: [{ key: "", sourcePath: "" }],
    to: [],
    cc: [],
    bcc: [],
    changedFields: [],
  };
}

function splitCsv(value: string) {
  return value.split(",").map((v) => v.trim()).filter(Boolean);
}

type PickerTab = "FIELDS" | "CONDITIONALS" | "ADVANCED";

export default function AutomationFormDetailClient({ formKey }: { formKey: FormKey }) {
  const [config, setConfig] = useState<ApiConfig | null>(null);
  const [catalog, setCatalog] = useState<Array<{ type: ActionType; name: string; description: string }>>([]);
  const [fieldCatalog, setFieldCatalog] = useState<FieldCatalog>({
    invoice: [],
    proforma: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [openPickerKey, setOpenPickerKey] = useState<string | null>(null);
  const [pickerTab, setPickerTab] = useState<PickerTab>("FIELDS");
  const [pickerSearch, setPickerSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/automation/forms", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load form config");
        setConfig(data.config);
        setCatalog(data.actionCatalog || []);
        setFieldCatalog(data.fieldCatalog || { invoice: [], proforma: [] });
      } catch (err: any) {
        setError(err?.message || "Failed to load form config");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const actions = useMemo(() => config?.forms?.[formKey]?.actions || [], [config, formKey]);
  const fieldOptions = useMemo(() => fieldCatalog?.[formKey] || [], [fieldCatalog, formKey]);

  const setActions = (next: FormAction[]) => {
    if (!config) return;
    setConfig({
      ...config,
      forms: {
        ...config.forms,
        [formKey]: { actions: next },
      },
    });
  };

  const addAction = (type: ActionType) => setActions([...actions, createEmptyAction(type)]);
  const updateAction = (id: string, patch: Partial<FormAction>) => {
    setActions(actions.map((action) => (action.id === id ? { ...action, ...patch } : action)));
  };
  const removeAction = (id: string) => setActions(actions.filter((action) => action.id !== id));
  const pickerItems = useMemo(() => {
    const fieldItems = fieldOptions.map((field) => ({
      id: field.key,
      label: field.label,
      token: `{{${field.key}}}`,
      hint: field.key,
    }));
    if (pickerTab === "FIELDS") return fieldItems;
    if (pickerTab === "CONDITIONALS") {
      return [
        { id: "if-empty", label: "If field empty", token: "{{#if customer.primaryEmail}}{{customer.primaryEmail}}{{else}}no-email@example.com{{/if}}", hint: "Condition template" },
        { id: "if-status", label: "If paid status", token: "{{#if invoice.status}}{{invoice.status}}{{/if}}", hint: "Status condition" },
      ];
    }
    return [
      { id: "meta-event", label: "Event Type", token: "{{meta.eventType}}", hint: "create / update" },
      { id: "meta-time", label: "Triggered At", token: "{{meta.triggeredAt}}", hint: "ISO timestamp" },
      { id: "meta-company", label: "Company ID", token: "{{meta.companyId}}", hint: "execution context" },
    ];
  }, [fieldOptions, pickerTab]);

  const filteredPickerItems = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return pickerItems.filter((item) => {
      if (!q) return true;
      return (
        item.label.toLowerCase().includes(q) ||
        item.token.toLowerCase().includes(q) ||
        item.hint.toLowerCase().includes(q)
      );
    });
  }, [pickerItems, pickerSearch]);

  const insertToken = (actionId: string, mappingIndex: number, token: string) => {
    const inputKey = `${actionId}-${mappingIndex}`;
    const inputEl = inputRefs.current[inputKey];
    const currentMappings = actions.find((a) => a.id === actionId)?.mappings || [];
    const currentValue = currentMappings[mappingIndex]?.sourcePath || "";
    const start = inputEl?.selectionStart ?? currentValue.length;
    const end = inputEl?.selectionEnd ?? currentValue.length;
    const nextValue = `${currentValue.slice(0, start)}${token}${currentValue.slice(end)}`;

    updateAction(actionId, {
      mappings: currentMappings.map((m, i) =>
        i === mappingIndex ? { ...m, sourcePath: nextValue } : m,
      ),
    });

    const nextCaret = start + token.length;
    window.setTimeout(() => {
      const refreshedInput = inputRefs.current[inputKey];
      if (refreshedInput) {
        refreshedInput.focus();
        refreshedInput.setSelectionRange(nextCaret, nextCaret);
      }
    }, 0);
    setOpenPickerKey(null);
  };

  useEffect(() => {
    if (!openPickerKey) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (pickerRef.current?.contains(target)) return;
      if (target.closest("[data-token-picker-button='true']")) return;
      setOpenPickerKey(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [openPickerKey]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [pickerSearch, pickerTab, openPickerKey]);

  const handlePickerKeyDown = (event: KeyboardEvent<HTMLInputElement>, actionId: string, mappingIndex: number) => {
    if (!filteredPickerItems.length) {
      if (event.key === "Escape") setOpenPickerKey(null);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % filteredPickerItems.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filteredPickerItems.length) % filteredPickerItems.length);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const picked = filteredPickerItems[highlightedIndex];
      if (picked) insertToken(actionId, mappingIndex, picked.token);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpenPickerKey(null);
    }
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch("/api/automation/forms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save");
      setConfig(data.config);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (err: any) {
      setError(err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading…</div>;
  if (!config) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">Config unavailable.</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/automation/forms" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          ← Back to forms
        </Link>
        <button onClick={save} disabled={saving} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {saving ? "Saving..." : "Save Automation"}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-slate-900">Action Catalog</h2>
        <p className="mt-1 text-sm text-slate-600">Add actions for this form module.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {catalog.map((item) => (
            <button
              key={item.type}
              onClick={() => addAction(item.type)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              + {item.name}
            </button>
          ))}
        </div>
      </div>

      {actions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">No actions configured yet.</div>
      ) : (
        actions.map((action) => (
          <div key={action.id} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-center gap-3">
              <input
                value={action.name || ""}
                onChange={(e) => updateAction(action.id, { name: e.target.value })}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder={`${action.type} action name`}
              />
              <label className="text-xs font-medium text-slate-700">
                <input className="mr-2" type="checkbox" checked={action.enabled !== false} onChange={(e) => updateAction(action.id, { enabled: e.target.checked })} />
                Enabled
              </label>
              <button onClick={() => removeAction(action.id)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600">Remove</button>
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Trigger</div>
              <div className="flex flex-wrap gap-4">
                {EVENT_OPTIONS.map((eventName) => {
                  const selected = action.triggerEvents?.includes(eventName);
                  return (
                    <label key={eventName} className="text-sm text-slate-700">
                      <input
                        className="mr-2"
                        type="checkbox"
                        checked={!!selected}
                        onChange={(e) => {
                          const set = new Set(action.triggerEvents || []);
                          if (e.target.checked) set.add(eventName);
                          else set.delete(eventName);
                          updateAction(action.id, { triggerEvents: Array.from(set) as TriggerEvent[] });
                        }}
                      />
                      {eventName}
                    </label>
                  );
                })}
              </div>
              <input
                value={(action.changedFields || []).join(", ")}
                onChange={(e) => updateAction(action.id, { changedFields: splitCsv(e.target.value) })}
                className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Specific changed fields (optional): status,total"
              />
            </div>

            {action.type === "WEBHOOK" && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <input value={action.endpointUrl || ""} onChange={(e) => updateAction(action.id, { endpointUrl: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" placeholder="Webhook URL" />
                  <select value={action.method || "POST"} onChange={(e) => updateAction(action.id, { method: e.target.value as any })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                  <label className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">
                    <input className="mr-2" type="checkbox" checked={action.includeMeta !== false} onChange={(e) => updateAction(action.id, { includeMeta: e.target.checked })} />
                    Include meta payload
                  </label>
                </div>
                  <div className="rounded-xl border border-slate-200 p-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Map Data</div>
                    {(action.mappings || []).map((mapping, idx) => (
                      <div key={`${action.id}-map-${idx}`} className="relative mb-2 grid grid-cols-1 gap-2 md:grid-cols-12">
                        <input value={mapping.key || ""} onChange={(e) => updateAction(action.id, { mappings: (action.mappings || []).map((m, i) => (i === idx ? { ...m, key: e.target.value } : m)) })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-4" placeholder="Key" />
                      <input
                        value={mapping.sourcePath || ""}
                        onChange={(e) => updateAction(action.id, { mappings: (action.mappings || []).map((m, i) => (i === idx ? { ...m, sourcePath: e.target.value } : m)) })}
                        ref={(el) => {
                          inputRefs.current[`${action.id}-${idx}`] = el;
                        }}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-4"
                        placeholder="Value token or field path"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const key = `${action.id}-${idx}`;
                          setOpenPickerKey(openPickerKey === key ? null : key);
                          setPickerTab("FIELDS");
                          setPickerSearch("");
                        }}
                        data-token-picker-button="true"
                        className="rounded-lg border border-slate-300 px-2 py-2 text-xs font-semibold text-slate-700 md:col-span-1"
                      >
                        ⋯
                      </button>
                      <input value={mapping.staticValue || ""} onChange={(e) => updateAction(action.id, { mappings: (action.mappings || []).map((m, i) => (i === idx ? { ...m, staticValue: e.target.value } : m)) })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-3" placeholder="Static value" />
                      <button onClick={() => updateAction(action.id, { mappings: (action.mappings || []).filter((_, i) => i !== idx) })} className="rounded-lg border border-rose-200 px-2 text-xs text-rose-600 md:col-span-1">-</button>
                      {openPickerKey === `${action.id}-${idx}` ? (
                        <div ref={pickerRef} className="z-20 rounded-xl border border-slate-200 bg-white p-3 shadow-xl md:absolute md:left-[34%] md:top-11 md:w-[360px]">
                          <div className="mb-3 flex gap-3 border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <button className={pickerTab === "FIELDS" ? "text-blue-600" : ""} onClick={() => setPickerTab("FIELDS")} type="button">Fields</button>
                            <button className={pickerTab === "CONDITIONALS" ? "text-blue-600" : ""} onClick={() => setPickerTab("CONDITIONALS")} type="button">Conditionals</button>
                            <button className={pickerTab === "ADVANCED" ? "text-blue-600" : ""} onClick={() => setPickerTab("ADVANCED")} type="button">Advanced</button>
                          </div>
                          <div className="relative mb-3">
                            <Search size={14} className="absolute left-2 top-2.5 text-slate-400" />
                            <input
                              value={pickerSearch}
                              onChange={(e) => setPickerSearch(e.target.value)}
                              onKeyDown={(e) => handlePickerKeyDown(e, action.id, idx)}
                              className="w-full rounded-lg border border-slate-300 py-2 pl-7 pr-2 text-sm"
                              placeholder="Search token"
                            />
                          </div>
                          <div className="max-h-56 overflow-auto">
                            {filteredPickerItems.map((item, itemIndex) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => insertToken(action.id, idx, item.token)}
                                  onMouseEnter={() => setHighlightedIndex(itemIndex)}
                                  className={`mb-1 w-full rounded-md px-2 py-2 text-left ${
                                    itemIndex === highlightedIndex ? "bg-slate-100" : "hover:bg-slate-50"
                                  }`}
                                >
                                  <div className="text-sm font-medium text-slate-800">{item.label}</div>
                                  <div className="text-xs text-slate-500">{item.token}</div>
                                </button>
                              ))}
                            {filteredPickerItems.length === 0 ? (
                              <div className="px-2 py-3 text-xs text-slate-500">No matching tokens.</div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                  <button onClick={() => updateAction(action.id, { mappings: [...(action.mappings || []), { key: "", sourcePath: "" }] })} className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700">+ Row</button>
                </div>
              </div>
            )}

            {action.type === "EMAIL" && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input value={(action.to || []).join(", ")} onChange={(e) => updateAction(action.id, { to: splitCsv(e.target.value) })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" placeholder="To recipients or payload paths" />
                <input value={(action.cc || []).join(", ")} onChange={(e) => updateAction(action.id, { cc: splitCsv(e.target.value) })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="CC" />
                <input value={(action.bcc || []).join(", ")} onChange={(e) => updateAction(action.id, { bcc: splitCsv(e.target.value) })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="BCC" />
                <input value={action.replyTo || ""} onChange={(e) => updateAction(action.id, { replyTo: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" placeholder="Reply-To" />
                <input value={action.subject || ""} onChange={(e) => updateAction(action.id, { subject: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" placeholder="Subject (supports {{invoice.invoiceNumber}})" />
                <textarea value={action.body || ""} onChange={(e) => updateAction(action.id, { body: e.target.value })} className="min-h-[120px] rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" placeholder="Email body (HTML/text with placeholders)" />
              </div>
            )}

            {action.type === "REDIRECT" && (
              <input value={action.redirectUrl || ""} onChange={(e) => updateAction(action.id, { redirectUrl: e.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Redirect URL/template" />
            )}

            {action.type === "INTERNAL_TASK" && (
              <textarea value={action.taskTemplate || ""} onChange={(e) => updateAction(action.id, { taskTemplate: e.target.value })} className="min-h-[100px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Task template/instructions for internal follow-up" />
            )}
          </div>
        ))
      )}

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
      {saved ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Automation saved.</div> : null}
    </div>
  );
}
