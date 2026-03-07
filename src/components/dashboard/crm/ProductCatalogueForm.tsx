"use client";

import { useState, useCallback } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  Package,
  Tag,
  Layers,
  DollarSign,
  IndianRupee,
  ToggleLeft,
  ToggleRight,
  GripVertical,
  AlertCircle,
  CheckCircle2,
  Globe,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────
export interface VariantRow {
  id: string;
  name: string;
  priceINR: number | "";
  priceUSD: number | "";
  year: number | "";
}

export interface ProductCatalogueFormData {
  name: string;
  sku: string;
  pricingMode: "FIXED" | "VARIABLE";
  // Fixed pricing
  fixedPriceINR: number | "";
  fixedPriceUSD: number | "";
  // Variable pricing rows
  variants: VariantRow[];
  // Other fields
  domain: string;
  category: string;
}

interface ProductCatalogueFormProps {
  value: ProductCatalogueFormData;
  onChange: (data: ProductCatalogueFormData) => void;
  onSubmit?: (data: ProductCatalogueFormData) => void;
  onCancel?: () => void;
  saving?: boolean;
  categories?: { value: string; label: string; icon?: string }[];
  domains?: string[];
}

// ─── Defaults ───────────────────────────────────────────────────────────────
export const DEFAULT_FORM_DATA: ProductCatalogueFormData = {
  name: "",
  sku: "",
  pricingMode: "FIXED",
  fixedPriceINR: "",
  fixedPriceUSD: "",
  variants: [
    {
      id: crypto.randomUUID(),
      name: "",
      priceINR: "",
      priceUSD: "",
      year: new Date().getFullYear(),
    },
  ],
  domain: "",
  category: "",
};

const DEFAULT_CATEGORIES = [
  { value: "JOURNAL_SUBSCRIPTION", label: "Journal Subscription", icon: "📰" },
  { value: "COURSE", label: "Course", icon: "🎓" },
  { value: "WORKSHOP", label: "Workshop", icon: "🛠️" },
  { value: "DOI_SERVICE", label: "DOI Service", icon: "🔗" },
  { value: "APC", label: "APC", icon: "📝" },
  { value: "CERTIFICATE", label: "Certificate", icon: "🏅" },
  { value: "DIGITAL_SERVICE", label: "Digital Service", icon: "💻" },
  { value: "MISC", label: "Miscellaneous", icon: "📦" },
];

const YEAR_OPTIONS = Array.from(
  { length: 10 },
  (_, i) => new Date().getFullYear() + i - 2,
);

// ─── Sub-component: Field Label ──────────────────────────────────────────────
const FieldLabel = ({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) => (
  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
    {children}
    {required && <span className="text-rose-400 ml-1">*</span>}
  </label>
);

// ─── Sub-component: Text Input ───────────────────────────────────────────────
const TextInput = ({
  value,
  onChange,
  placeholder,
  className = "",
  prefix,
  mono = false,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  prefix?: React.ReactNode;
  mono?: boolean;
  required?: boolean;
}) => (
  <div className={`relative ${className}`}>
    {prefix && (
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none select-none">
        {prefix}
      </span>
    )}
    <input
      type="text"
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`
                w-full h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm
                text-slate-800 placeholder-slate-300
                focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400
                transition-all duration-150
                ${prefix ? "pl-9" : ""}
                ${mono ? "font-mono tracking-widest text-xs" : "font-medium"}
            `}
    />
  </div>
);

// ─── Sub-component: Number Input ─────────────────────────────────────────────
const NumInput = ({
  value,
  onChange,
  placeholder,
  prefix,
  min = 0,
}: {
  value: number | "";
  onChange: (v: number | "") => void;
  placeholder?: string;
  prefix?: React.ReactNode;
  min?: number;
}) => (
  <div className="relative">
    {prefix && (
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm font-bold select-none">
        {prefix}
      </span>
    )}
    <input
      type="number"
      min={min}
      step="0.01"
      value={value === "" ? "" : value}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "" ? "" : parseFloat(v) || 0);
      }}
      placeholder={placeholder}
      className={`
                w-full h-11 rounded-xl border border-slate-200 bg-white text-sm
                text-slate-800 placeholder-slate-300 font-mono
                focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400
                transition-all duration-150 text-right pr-3.5
                ${prefix ? "pl-9" : "pl-3.5"}
            `}
    />
  </div>
);

// ─── Sub-component: Pricing Mode Toggle ──────────────────────────────────────
const PricingModeToggle = ({
  mode,
  onChange,
}: {
  mode: "FIXED" | "VARIABLE";
  onChange: (m: "FIXED" | "VARIABLE") => void;
}) => (
  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
    {(["FIXED", "VARIABLE"] as const).map((m) => (
      <button
        key={m}
        type="button"
        onClick={() => onChange(m)}
        className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider
                    transition-all duration-200
                    ${
                      mode === m
                        ? "bg-white text-indigo-700 shadow-sm shadow-indigo-100 border border-indigo-100"
                        : "text-slate-400 hover:text-slate-600"
                    }
                `}
      >
        {m === "FIXED" ? (
          <>
            <DollarSign size={12} /> Fixed Pricing
          </>
        ) : (
          <>
            <Layers size={12} /> Variable Pricing
          </>
        )}
      </button>
    ))}
  </div>
);

// ─── Sub-component: Variant Row ───────────────────────────────────────────────
const VariantRowComp = ({
  row,
  index,
  total,
  onChange,
  onRemove,
}: {
  row: VariantRow;
  index: number;
  total: number;
  onChange: (id: string, field: keyof VariantRow, value: any) => void;
  onRemove: (id: string) => void;
}) => (
  <div className="group flex items-start gap-3 bg-white border border-slate-200 rounded-2xl p-4 hover:border-indigo-200 hover:shadow-sm transition-all duration-200">
    {/* Drag handle indicator */}
    <div className="flex flex-col items-center pt-2.5 pr-1 text-slate-300 shrink-0">
      <GripVertical size={16} />
      <span className="text-[9px] font-black mt-1 text-slate-200">
        #{index + 1}
      </span>
    </div>

    <div className="flex-1 grid grid-cols-12 gap-3">
      {/* Variant Name */}
      <div className="col-span-12 sm:col-span-4 space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Variant Name
        </label>
        <TextInput
          value={row.name}
          onChange={(v) => onChange(row.id, "name", v)}
          placeholder="e.g. Print + Online"
        />
      </div>

      {/* Price INR */}
      <div className="col-span-6 sm:col-span-3 space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <IndianRupee size={10} className="text-emerald-500" /> Price (INR)
        </label>
        <NumInput
          value={row.priceINR}
          onChange={(v) => onChange(row.id, "priceINR", v)}
          placeholder="0.00"
          prefix="₹"
        />
      </div>

      {/* Price USD */}
      <div className="col-span-6 sm:col-span-3 space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
          <DollarSign size={10} className="text-blue-500" /> Price (USD)
        </label>
        <NumInput
          value={row.priceUSD}
          onChange={(v) => onChange(row.id, "priceUSD", v)}
          placeholder="0.00"
          prefix="$"
        />
      </div>

      {/* Year */}
      <div className="col-span-12 sm:col-span-2 space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Year
        </label>
        <select
          value={row.year}
          onChange={(e) => onChange(row.id, "year", parseInt(e.target.value))}
          className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
        >
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>

    {/* Remove button */}
    <div className="shrink-0 pt-7">
      {total > 1 ? (
        <button
          type="button"
          onClick={() => onRemove(row.id)}
          className="p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all duration-150 opacity-0 group-hover:opacity-100"
          title="Remove this variant"
        >
          <Trash2 size={15} />
        </button>
      ) : (
        <div className="w-9" />
      )}
    </div>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ProductCatalogueForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  saving = false,
  categories = DEFAULT_CATEGORIES,
  domains = [],
}: ProductCatalogueFormProps) {
  const [domainSearch, setDomainSearch] = useState("");
  const [domainOpen, setDomainOpen] = useState(false);

  const setField = useCallback(
    (field: keyof ProductCatalogueFormData, v: any) => {
      onChange({ ...value, [field]: v });
    },
    [value, onChange],
  );

  const setPricingMode = useCallback(
    (mode: "FIXED" | "VARIABLE") => {
      setField("pricingMode", mode);
    },
    [setField],
  );

  // ── Variant helpers ──
  const addVariant = () => {
    setField("variants", [
      ...value.variants,
      {
        id: crypto.randomUUID(),
        name: "",
        priceINR: "",
        priceUSD: "",
        year: new Date().getFullYear(),
      },
    ]);
  };

  const updateVariant = (id: string, field: keyof VariantRow, val: any) => {
    setField(
      "variants",
      value.variants.map((v) => (v.id === id ? { ...v, [field]: val } : v)),
    );
  };

  const removeVariant = (id: string) => {
    setField(
      "variants",
      value.variants.filter((v) => v.id !== id),
    );
  };

  // ── Domain autocomplete ──
  const filteredDomains = domainSearch
    ? domains.filter((d) =>
        d.toLowerCase().includes(domainSearch.toLowerCase()),
      )
    : domains;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(value);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Section 1: Identity ─────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Package size={14} />
          </div>
          <h3 className="text-sm font-bold text-slate-700 tracking-tight">
            Product Identity
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Product Name */}
          <div className="sm:col-span-2 space-y-1.5">
            <FieldLabel required>Product Name</FieldLabel>
            <TextInput
              value={value.name}
              onChange={(v) => setField("name", v)}
              placeholder="e.g. STM Journal Subscription – Physics"
              required
            />
          </div>

          {/* SKU */}
          <div className="space-y-1.5">
            <FieldLabel>SKU</FieldLabel>
            <TextInput
              value={value.sku}
              onChange={(v) => setField("sku", v.toUpperCase())}
              placeholder="STM-PHY-001"
              mono
              prefix={<Tag size={13} />}
            />
            <p className="text-[10px] text-slate-400 pl-1">
              Unique Stock Keeping Unit identifier
            </p>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <FieldLabel required>Category</FieldLabel>
            <div className="relative">
              <select
                required
                value={value.category}
                onChange={(e) => setField("category", e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-3.5 pr-9 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all appearance-none cursor-pointer"
              >
                <option value="">— Select a category —</option>
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.icon ? `${c.icon} ` : ""}
                    {c.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Domain */}
        <div className="space-y-1.5">
          <FieldLabel>Domain / Industry</FieldLabel>
          <div className="relative">
            <Globe
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10"
            />
            <input
              type="text"
              value={domainSearch || value.domain}
              onChange={(e) => {
                setDomainSearch(e.target.value);
                setField("domain", e.target.value);
                setDomainOpen(true);
              }}
              onFocus={() => setDomainOpen(true)}
              onBlur={() => setTimeout(() => setDomainOpen(false), 150)}
              placeholder="e.g. Physics, Chemistry, Medical Sciences..."
              className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 text-sm font-medium text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
            />
            {/* Domain dropdown */}
            {domainOpen && filteredDomains.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-100 rounded-xl shadow-xl z-20 overflow-hidden max-h-44 overflow-y-auto">
                {filteredDomains.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onMouseDown={() => {
                      setField("domain", d);
                      setDomainSearch("");
                      setDomainOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors font-medium"
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Section 2: Pricing Mode ─────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <DollarSign size={14} />
          </div>
          <h3 className="text-sm font-bold text-slate-700 tracking-tight">
            Pricing Mode
          </h3>
        </div>

        <PricingModeToggle mode={value.pricingMode} onChange={setPricingMode} />

        {/* FIXED pricing */}
        {value.pricingMode === "FIXED" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* INR */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <IndianRupee size={14} className="text-emerald-600" />
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Price in INR
                </span>
              </div>
              <NumInput
                value={value.fixedPriceINR}
                onChange={(v) => setField("fixedPriceINR", v)}
                placeholder="0.00"
                prefix="₹"
              />
              <p className="text-[10px] text-emerald-600 opacity-70">
                Indian Rupee — domestic pricing
              </p>
            </div>

            {/* USD */}
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign size={14} className="text-blue-600" />
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                  Price in USD
                </span>
              </div>
              <NumInput
                value={value.fixedPriceUSD}
                onChange={(v) => setField("fixedPriceUSD", v)}
                placeholder="0.00"
                prefix="$"
              />
              <p className="text-[10px] text-blue-600 opacity-70">
                US Dollar — international pricing
              </p>
            </div>
          </div>
        )}

        {/* VARIABLE pricing */}
        {value.pricingMode === "VARIABLE" && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Column header hint */}
            <div className="hidden sm:grid grid-cols-12 gap-3 px-14 text-[9px] font-bold uppercase tracking-widest text-slate-300">
              <div className="col-span-4">Variant Name</div>
              <div className="col-span-3 text-right pr-2">INR Price</div>
              <div className="col-span-3 text-right pr-2">USD Price</div>
              <div className="col-span-2">Year</div>
            </div>

            {/* Variant rows */}
            <div className="space-y-2.5">
              {value.variants.map((row, i) => (
                <VariantRowComp
                  key={row.id}
                  row={row}
                  index={i}
                  total={value.variants.length}
                  onChange={updateVariant}
                  onRemove={removeVariant}
                />
              ))}
            </div>

            {/* Add row button */}
            <button
              type="button"
              onClick={addVariant}
              className="w-full flex items-center justify-center gap-2 h-11 border-2 border-dashed border-slate-200 rounded-2xl text-sm font-semibold text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/50 transition-all duration-200 group"
            >
              <Plus
                size={16}
                className="group-hover:scale-110 transition-transform"
              />
              Add Variant Row
            </button>

            {/* Summary */}
            {value.variants.length > 0 &&
              value.variants.some(
                (v) => v.priceINR !== "" || v.priceUSD !== "",
              ) && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <CheckCircle2
                    size={13}
                    className="text-emerald-500 shrink-0"
                  />
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {value.variants.filter((v) => v.name).length} of{" "}
                    {value.variants.length} variant
                    {value.variants.length > 1 ? "s" : ""} named &nbsp;·&nbsp;
                    {
                      value.variants.filter(
                        (v) => v.priceINR !== "" || v.priceUSD !== "",
                      ).length
                    }{" "}
                    with pricing
                  </span>
                </div>
              )}
          </div>
        )}
      </section>

      {/* ── Validation hint ─────────────────────────────────────────── */}
      {value.pricingMode === "VARIABLE" &&
        value.variants.some((v) => !v.name) && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 rounded-xl border border-amber-100">
            <AlertCircle size={13} className="text-amber-500 shrink-0" />
            <span className="text-[10px] text-amber-600 font-semibold">
              Some variant rows are missing a name — please complete all fields
              before saving.
            </span>
          </div>
        )}

      {/* ── Form Actions ─────────────────────────────────────────────── */}
      {(onSubmit || onCancel) && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 font-medium">
            {value.pricingMode === "VARIABLE"
              ? `${value.variants.length} variant row${value.variants.length > 1 ? "s" : ""} configured`
              : "Fixed pricing mode"}
          </p>
          <div className="flex items-center gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
            )}
            {onSubmit && (
              <button
                type="submit"
                disabled={saving || !value.name || !value.category}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-indigo-200 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    Save Product
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
