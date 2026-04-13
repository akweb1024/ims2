"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  CRMPageShell,
  CRMStatCard,
  CRMModal,
  CRMBadge,
} from "@/components/crm/CRMPageShell";
import {
  Search,
  Filter,
  Plus,
  ChevronRight,
  Zap,
  Target,
  Layers,
  Layout,
  ShieldCheck,
  CreditCard,
  Globe,
  ArrowRight,
  Star,
  Trash2,
  Edit3,
  MoreHorizontal,
  BarChart3,
  Settings2,
  Sparkles,
  Box,
  Info,
  CheckCircle2,
  DollarSign,
  Calculator,
  Activity,
  UploadCloud,
  DownloadCloud,
} from "lucide-react";
import { cn } from "@/lib/classnames";
import FormattedDate from "@/components/common/FormattedDate";
import VariantAdminPanel from "@/components/dashboard/crm/VariantAdminPanel";
import ProductCatalogueForm, {
  DEFAULT_FORM_DATA,
  PREDEFINED_DOMAINS,
  type ProductCatalogueFormData,
} from "@/components/dashboard/crm/ProductCatalogueForm";

// ─── Constants ─────────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    value: "JOURNAL_SUBSCRIPTION",
    label: "Journal Subscription",
    icon: "📰",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    value: "COURSE",
    label: "Course",
    icon: "🎓",
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    value: "WORKSHOP",
    label: "Workshop",
    icon: "🛠️",
    color: "bg-orange-50 text-orange-700 border-orange-200",
  },
  {
    value: "DOI_SERVICE",
    label: "DOI Service",
    icon: "🔗",
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
  {
    value: "APC",
    label: "APC",
    icon: "📝",
    color: "bg-rose-50 text-rose-700 border-rose-200",
  },
  {
    value: "CERTIFICATE",
    label: "Certificate",
    icon: "🏅",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    value: "DIGITAL_SERVICE",
    label: "Digital Service",
    icon: "💻",
    color: "bg-teal-50 text-teal-700 border-teal-200",
  },
  {
    value: "MISC",
    label: "Miscellaneous",
    icon: "📦",
    color: "bg-gray-50 text-gray-700 border-gray-200",
  },
] as const;

const PRICING_MODELS = [
  {
    value: "FIXED",
    label: "Fixed Price",
    icon: "💰",
    desc: "Single fixed price per unit",
  },
  {
    value: "TIERED",
    label: "Tiered",
    icon: "📊",
    desc: "Different price per quantity tier",
  },
  {
    value: "VOLUME",
    label: "Volume Discount",
    icon: "📉",
    desc: "Price drops with higher volume",
  },
  {
    value: "CUSTOM",
    label: "Negotiated",
    icon: "🤝",
    desc: "Price negotiated per deal",
  },
] as const;

const BILLING_CYCLES = [
  { value: "ONE_TIME", label: "One-Time" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "ANNUAL", label: "Annual" },
];

interface PriceTier {
  minQty: number;
  maxQty?: number | null;
  priceINR: number;
  priceUSD: number;
  label?: string;
}

interface InvoiceProduct {
  id: string;
  type: string;
  basePrice: number | null;
  sku?: string;
  name: string;
  category: string;
  pricingModel: string;
  description?: string;
  shortDesc?: string;
  priceINR: number;
  priceUSD: number;
  priceTiers?: PriceTier[];
  taxRate: number;
  taxIncluded: boolean;
  hsnCode?: string;
  sacCode?: string;
  billingCycle?: string;
  unit: string;
  minQuantity: number;
  maxQuantity?: number;
  isActive: boolean;
  isFeatured: boolean;
  tags: string[];
  notes?: string;
  domain?: string;
  attributes?: any;
  productAttributes?: any[];
  variants?: any[];
  createdAt: string;
  updatedAt: string;
}

interface BulkEditFormState {
  category: string;
  pricingModel: string;
  taxRate: string;
  billingCycle: string;
  domain: string;
  notes: string;
  isActive: string;
  isFeatured: string;
  taxIncluded: string;
  isPhysicalDeliverable: string;
  trackInventory: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
const FMT_INR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(n);
const FMT_USD = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(n);

const getCatConfig = (val: string) =>
  CATEGORIES.find((c) => c.value === val) || CATEGORIES[CATEGORIES.length - 1];
const getPricingConfig = (val: string) =>
  PRICING_MODELS.find((p) => p.value === val) || PRICING_MODELS[0];

// ─── Empty form state ──────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: "",
  type: "SIMPLE",
  basePrice: 0,
  category: "MISC",
  pricingModel: "FIXED",
  description: "",
  shortDesc: "",
  priceINR: 0,
  priceUSD: 0,
  taxRate: 18,
  taxIncluded: false,
  hsnCode: "",
  sacCode: "",
  billingCycle: "ONE_TIME",
  unit: "unit",
  minQuantity: 1,
  maxQuantity: "",
  sku: "",
  isActive: true,
  isFeatured: false,
  tags: "",
  notes: "",
  priceTiers: [{ minQty: 1, maxQty: "", priceINR: 0, priceUSD: 0, label: "" }],
  productAttributes: [],
  variants: [],
};

const BULK_EDIT_INITIAL_FORM: BulkEditFormState = {
  category: "",
  pricingModel: "",
  taxRate: "",
  billingCycle: "",
  domain: "",
  notes: "",
  isActive: "",
  isFeatured: "",
  taxIncluded: "",
  isPhysicalDeliverable: "",
  trackInventory: "",
};

export default function InvoiceProductsPage() {
  const [products, setProducts] = useState<InvoiceProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>(
    {},
  );
  const [userRole, setUserRole] = useState("EXECUTIVE");

  // Filters
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [pricingFilter, setPricingFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditForm, setBulkEditForm] = useState<BulkEditFormState>(
    BULK_EDIT_INITIAL_FORM,
  );

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InvoiceProduct | null>(
    null,
  );
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [catalogueForm, setCatalogueForm] =
    useState<ProductCatalogueFormData>(DEFAULT_FORM_DATA);
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [globalAttributes, setGlobalAttributes] = useState<any[]>([]);

  // FX converter
  const [fxRate, setFxRate] = useState(83.5);
  const [fxInput, setFxInput] = useState("");
  const [fxCurrency, setFxCurrency] = useState<"INR" | "USD">("INR");
  const searchParams = useSearchParams();
  const openedFromQuery = useRef(false);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : "";
  // Memoize authH so its reference is stable between renders —
  // without this, authH causes fetchProducts/fetchAttributes to re-create
  // on EVERY render, spawning an infinite useEffect loop.
  const authH = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),

    [token],
  );

  useEffect(() => {
    const r = localStorage.getItem("userRole");
    if (r) setUserRole(r);
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sortBy,
        sortDir,
        ...(q && { q }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(pricingFilter && { pricingModel: pricingFilter }),
        ...(activeFilter !== "" && { isActive: activeFilter }),
        ...(featuredOnly && { isFeatured: "true" }),
      });
      const res = await fetch(`/api/invoice-products?${params}`, {
        headers: authH,
      });
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data.data || []);
      setTotal(data.pagination?.total || 0);
      setCategoryCounts(data.categoryCounts || {});
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    q,
    categoryFilter,
    pricingFilter,
    activeFilter,
    featuredOnly,
    sortBy,
    sortDir,
    authH,
  ]);

  const fetchAttributes = useCallback(async () => {
    try {
      const res = await fetch("/api/invoice-products/attributes", {
        headers: authH,
      });
      if (res.ok) setGlobalAttributes(await res.json());
    } catch (e) {
      console.error("Failed to fetch attributes", e);
    }
  }, [authH]);

  useEffect(() => {
    fetchProducts();
    fetchAttributes();
  }, [fetchProducts, fetchAttributes]);

  const openCreate = useCallback(() => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setCatalogueForm(DEFAULT_FORM_DATA);
    setShowModal(true);
  }, []);

  const openEdit = (p: InvoiceProduct) => {
    setEditingProduct(p);
    const legacyForm = {
      name: p.name,
      type: p.type || "SIMPLE",
      basePrice: p.basePrice || 0,
      category: p.category,
      pricingModel: p.pricingModel,
      description: p.description || "",
      shortDesc: p.shortDesc || "",
      priceINR: p.priceINR,
      priceUSD: p.priceUSD,
      taxRate: p.taxRate,
      taxIncluded: p.taxIncluded,
      hsnCode: p.hsnCode || "",
      sacCode: p.sacCode || "",
      billingCycle: p.billingCycle || "ONE_TIME",
      unit: p.unit,
      minQuantity: p.minQuantity,
      maxQuantity: p.maxQuantity || "",
      sku: p.sku || "",
      isActive: p.isActive,
      isFeatured: p.isFeatured,
      tags: p.tags.join(", "),
      notes: p.notes || "",
      priceTiers:
        p.priceTiers && p.priceTiers.length > 0
          ? p.priceTiers.map((t) => ({ ...t, maxQty: t.maxQty || "" }))
          : [{ minQty: 1, maxQty: "", priceINR: 0, priceUSD: 0, label: "" }],
      productAttributes: p.productAttributes || [],
      variants: p.variants || [],
    };
    setForm(legacyForm);

    // Populate the new catalogue form from existing product data
    const isVariable = p.type === "VARIABLE";
    const subscriptionOptions = (p.productAttributes as any)?.subscriptionOptions || {};
    const inventorySettings = (p.productAttributes as any)?.inventorySettings || {};
    setCatalogueForm({
      name: p.name,
      sku: p.sku || "",
      pricingMode: isVariable ? "VARIABLE" : "FIXED",
      fixedPriceINR: p.priceINR || "",
      fixedPriceUSD: p.priceUSD || "",
      variants:
        p.variants && p.variants.length > 0
          ? p.variants.map((v: any) => ({
              id: v.id || crypto.randomUUID(),
              name: v.sku || v.name || "",
              priceINR: v.priceINR ?? "",
              priceUSD: v.priceUSD ?? "",
              year: new Date().getFullYear(),
            }))
          : [
              {
                id: crypto.randomUUID(),
                name: "",
                priceINR: "",
                priceUSD: "",
                year: new Date().getFullYear(),
              },
            ],
      domain: p.domain || "",
      category: p.category || "",
      hsnCode: p.hsnCode || "",
      sacCode: p.sacCode || "",
      subscriptionFrequency: subscriptionOptions.frequency || "ANNUAL",
      subscriptionYear: subscriptionOptions.year || new Date().getFullYear(),
      subscriptionMode: subscriptionOptions.mode || "PRINT",
      subscriptionPublisher: subscriptionOptions.publisher || "STM Journals",
      isPhysicalDeliverable: Boolean(inventorySettings.isPhysicalDeliverable),
      trackInventory: Boolean(inventorySettings.trackInventory),
    });

    setShowModal(true);
  };

  useEffect(() => {
    if (openedFromQuery.current) return;
    const shouldOpen = searchParams.get("create");
    if (shouldOpen === "1" || shouldOpen === "true") {
      openedFromQuery.current = true;
      openCreate();
    }
  }, [searchParams, openCreate]);

  const buildPayload = (currentForm: ProductCatalogueFormData) => {
    // Merge new catalogueForm fields with legacy form fields
    const isVariable = currentForm.pricingMode === "VARIABLE";
    const journalSubscriptionAttributes =
      (currentForm.category || form.category) === "JOURNAL_SUBSCRIPTION"
        ? {
            subscriptionOptions: {
              frequency: currentForm.subscriptionFrequency || "ANNUAL",
              year:
                Number(currentForm.subscriptionYear) || new Date().getFullYear(),
              mode: currentForm.subscriptionMode || "PRINT",
            },
          }
        : null;
    const inventorySettings = {
      inventorySettings: {
        isPhysicalDeliverable: !!currentForm.isPhysicalDeliverable,
        trackInventory: !!currentForm.trackInventory,
      },
    };
    return {
      name: currentForm.name.trim() || form.name.trim(),
      type: isVariable ? "VARIABLE" : "SIMPLE",
      basePrice: isVariable ? null : null,
      category: currentForm.category || form.category,
      pricingModel: form.pricingModel,
      description: form.description || null,
      shortDesc: form.shortDesc || null,
      priceINR: isVariable ? 0 : Number(currentForm.fixedPriceINR) || 0,
      priceUSD: isVariable ? 0 : Number(currentForm.fixedPriceUSD) || 0,
      taxRate: Number(form.taxRate) || 18,
      taxIncluded: form.taxIncluded,
      hsnCode: currentForm.hsnCode || form.hsnCode || null,
      sacCode: currentForm.sacCode || form.sacCode || null,
      billingCycle: form.billingCycle || null,
      unit: form.unit || "unit",
      minQuantity: Number(form.minQuantity) || 1,
      maxQuantity: form.maxQuantity ? Number(form.maxQuantity) : null,
      sku: currentForm.sku || form.sku || null,
      isActive: form.isActive,
      isFeatured: form.isFeatured,
      tags: form.tags
        .split(",")
        .map((t: string) => t.trim())
        .filter(Boolean),
      notes: form.notes || null,
      domain: currentForm.domain?.trim() || null,
      productAttributes: {
        ...(journalSubscriptionAttributes || {}),
        ...inventorySettings,
      },
      priceTiers: null,
      ...(isVariable && currentForm.variants.length > 0
        ? {
            variants: currentForm.variants
              .filter((v) => v.name)
              .map((v) => ({
                sku: v.name,
                priceINR: Number(v.priceINR) || 0,
                priceUSD: Number(v.priceUSD) || 0,
                isActive: true,
                attributes: { year: v.year, duration: v.duration },
              })),
          }
        : {}),
    };
  };

  const normalizeDomainName = (domain: string) => domain.trim();

  const buildDomainCode = (domain: string) => {
    const tokens = normalizeDomainName(domain)
      .split(/[^A-Za-z0-9]+/)
      .filter(Boolean);
    const acronym = tokens.map((token) => token[0]).join("").toUpperCase();
    const compact = normalizeDomainName(domain)
      .replace(/[^A-Za-z0-9]+/g, "")
      .toUpperCase();
    return (acronym || compact).slice(0, 12) || "DOMAIN";
  };

  const ensureJournalDomainExists = async (domain: string) => {
    const normalized = normalizeDomainName(domain);
    if (!normalized) return;

    const existingRes = await fetch("/api/journals/domains", {
      credentials: "include",
    });
    if (!existingRes.ok) return;

    const existingDomains = await existingRes.json();
    const knownDomains = Array.isArray(existingDomains)
      ? existingDomains
      : Array.isArray(existingDomains?.data)
        ? existingDomains.data
        : [];

    const alreadyExists = knownDomains.some((item: any) => {
      const name = typeof item === "string" ? item : item?.name;
      return (
        String(name || "").trim().toLowerCase() === normalized.toLowerCase()
      );
    });

    if (alreadyExists) return;

    const createRes = await fetch("/api/journals/domains", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: normalized,
        code: buildDomainCode(normalized),
        isActive: true,
      }),
    });

    if (!createRes.ok && createRes.status !== 409) {
      const err = await createRes.json().catch(() => null);
      throw new Error(err?.error || err?.message || "Failed to create domain");
    }
  };

  const handleSave = async (submittedData?: ProductCatalogueFormData) => {
    const dataToUse = submittedData || catalogueForm;
    const productName = (dataToUse.name || form.name || "").trim();
    if (!productName) return;
    setSaving(true);
    try {
      if (
        dataToUse.domain.trim() &&
        !PREDEFINED_DOMAINS.some(
          (domain) =>
            domain.toLowerCase() === dataToUse.domain.trim().toLowerCase(),
        )
      ) {
        await ensureJournalDomainExists(dataToUse.domain);
      }

      const payload = buildPayload(dataToUse);
      const url = editingProduct
        ? `/api/invoice-products/${editingProduct.id}`
        : "/api/invoice-products";
      const method = editingProduct ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: authH,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        console.error("API Error Response:", errData);
        throw new Error(errData?.message || errData?.error || "Save failed");
      }
      setShowModal(false);
      fetchProducts();
    } catch (e: any) {
      console.error("handleSave Error:", e);
      alert(e.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/invoice-products/${id}`, {
        method: "DELETE",
        headers: authH,
      });
      if (!res.ok) throw new Error("Delete failed");
      fetchProducts();
    } catch (e: any) {
      console.error(e);
    } finally {
      setDeleting(null);
    }
  };

  const handleBulk = async (action: string) => {
    if (selected.size === 0) return;
    try {
      await fetch("/api/invoice-products/bulk", {
        method: "POST",
        headers: authH,
        body: JSON.stringify({ action, ids: Array.from(selected) }),
      });
      setSelected(new Set());
      fetchProducts();
    } catch (e: any) {
      console.error(e);
    }
  };

  const openBulkEdit = () => {
    setBulkEditForm(BULK_EDIT_INITIAL_FORM);
    setShowBulkEditModal(true);
  };

  const closeBulkEdit = () => {
    if (bulkSaving) return;
    setShowBulkEditModal(false);
    setBulkEditForm(BULK_EDIT_INITIAL_FORM);
  };

  const handleBulkEditField = (
    key: keyof BulkEditFormState,
    value: string,
  ) => {
    setBulkEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleBulkEditSave = async () => {
    if (selected.size === 0) return;

    const changes: Record<string, unknown> = {};
    if (bulkEditForm.category) changes.category = bulkEditForm.category;
    if (bulkEditForm.pricingModel) {
      changes.pricingModel = bulkEditForm.pricingModel;
    }
    if (bulkEditForm.taxRate !== "") {
      changes.taxRate = Number(bulkEditForm.taxRate);
    }
    if (bulkEditForm.billingCycle) {
      changes.billingCycle =
        bulkEditForm.billingCycle === "NULL" ? null : bulkEditForm.billingCycle;
    }
    if (bulkEditForm.domain.trim() !== "") {
      changes.domain =
        bulkEditForm.domain.trim().toUpperCase() === "NULL"
          ? null
          : bulkEditForm.domain.trim();
    }
    if (bulkEditForm.notes.trim() !== "") {
      changes.notes =
        bulkEditForm.notes.trim().toUpperCase() === "NULL"
          ? null
          : bulkEditForm.notes.trim();
    }
    if (bulkEditForm.isActive) changes.isActive = bulkEditForm.isActive === "true";
    if (bulkEditForm.isFeatured) {
      changes.isFeatured = bulkEditForm.isFeatured === "true";
    }
    if (bulkEditForm.taxIncluded) {
      changes.taxIncluded = bulkEditForm.taxIncluded === "true";
    }
    if (bulkEditForm.isPhysicalDeliverable) {
      changes.isPhysicalDeliverable =
        bulkEditForm.isPhysicalDeliverable === "true";
    }
    if (bulkEditForm.trackInventory) {
      changes.trackInventory = bulkEditForm.trackInventory === "true";
    }

    if (Object.keys(changes).length === 0) {
      alert("Choose at least one field to update.");
      return;
    }

    setBulkSaving(true);
    try {
      const res = await fetch("/api/invoice-products/bulk", {
        method: "POST",
        headers: authH,
        body: JSON.stringify({
          action: "EDIT",
          ids: Array.from(selected),
          changes,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Bulk edit failed");
      }
      closeBulkEdit();
      setSelected(new Set());
      fetchProducts();
    } catch (error: any) {
      alert(error.message || "Failed to bulk edit products");
    } finally {
      setBulkSaving(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };
  const selectAll = () => {
    if (selected.size === products.length) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(products.map((p) => p.id)));
  };

  const totalPages = Math.ceil(total / pageSize);

  const fxConverted = fxInput
    ? fxCurrency === "INR"
      ? Number(fxInput) / fxRate
      : Number(fxInput) * fxRate
    : null;

  const downloadTemplate = () => {
    const templateHeaders = [
      "name",
      "type",
      "category",
      "pricingModel",
      "priceINR",
      "priceUSD",
      "taxRate",
      "hsnCode",
      "sacCode",
      "sku",
      "domain",
      "subscriptionFrequency",
      "subscriptionYear",
      "subscriptionMode",
      "subscriptionPublisher",
      "notes",
    ];
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        templateHeaders.join(","),
        [
          "Sample Subscription",
          "SIMPLE",
          "JOURNAL_SUBSCRIPTION",
          "FIXED",
          "1500",
          "20",
          "18",
          "4901",
          "",
          "SUB-001",
          "Physics and Applied Mechanics",
          "ANNUAL",
          String(new Date().getFullYear()),
          "PRINT",
          "STM Journals",
          "Sample journal subscription product",
        ].join(","),
        [
          "Sample Course",
          "SIMPLE",
          "COURSE",
          "FIXED",
          "3000",
          "40",
          "18",
          "",
          "9983",
          "CRS-001",
          "Education and Social Sciences",
          "",
          "",
          "",
          "",
          "Sample course product",
        ].join(","),
      ].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "product_catalogue_template.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExportCSV = () => {
    if (products.length === 0) return alert("No products to export.");
    const escapeCsv = (value: unknown) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const headers = [
      "ID",
      "Name",
      "Type",
      "Category",
      "Pricing Model",
      "Price (INR)",
      "Price (USD)",
      "Tax Rate",
      "Tax Included",
      "SKU",
      "HSN Code",
      "SAC Code",
      "Billing Cycle",
      "Unit",
      "Min Quantity",
      "Max Quantity",
      "Domain",
      "Subscription Frequency",
      "Subscription Year",
      "Subscription Mode",
      "Subscription Publisher",
      "Tags",
      "Notes",
      "Is Featured",
      "Created At",
      "Updated At",
      "Status",
    ];
    const rows = products.map((p) => [
      p.id,
      escapeCsv(p.name),
      escapeCsv(p.type),
      escapeCsv(p.category),
      escapeCsv(p.pricingModel || ""),
      p.priceINR,
      p.priceUSD,
      p.taxRate ?? "",
      p.taxIncluded ? "YES" : "NO",
      escapeCsv(p.sku || ""),
      escapeCsv(p.hsnCode || ""),
      escapeCsv(p.sacCode || ""),
      escapeCsv(p.billingCycle || ""),
      escapeCsv(p.unit || ""),
      p.minQuantity ?? "",
      p.maxQuantity ?? "",
      escapeCsv(p.domain || ""),
      escapeCsv((p.productAttributes as any)?.subscriptionOptions?.frequency || ""),
      (p.productAttributes as any)?.subscriptionOptions?.year || "",
      escapeCsv((p.productAttributes as any)?.subscriptionOptions?.mode || ""),
      escapeCsv((p.productAttributes as any)?.subscriptionOptions?.publisher || ""),
      escapeCsv(Array.isArray(p.tags) ? p.tags.join(", ") : ""),
      escapeCsv(p.notes || ""),
      p.isFeatured ? "YES" : "NO",
      escapeCsv(
        p.createdAt ? new Date(p.createdAt).toISOString().split("T")[0] : "",
      ),
      escapeCsv(
        p.updatedAt ? new Date(p.updatedAt).toISOString().split("T")[0] : "",
      ),
      p.isActive ? "ACTIVE" : "INACTIVE",
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `product_catalogue_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;
      const lines = text.split("\n").filter((l) => l.trim() !== "");
      if (lines.length < 2) return alert("CSV is empty or missing data.");

      const headers = lines[0].split(",").map((h) => h.trim());
      const payloadProducts = lines.slice(1).map((line) => {
        const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        const obj: any = {};
        headers.forEach((h, i) => {
          let val = values[i] ? values[i].trim() : "";
          if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
          obj[h] = val;
        });
        return obj;
      });

      if (
        !confirm(
          `Found ${payloadProducts.length} rows. Do you want to try importing them?`,
        )
      ) {
        e.target.value = "";
        return;
      }

      try {
        const res = await fetch("/api/invoice-products/import", {
          method: "POST",
          headers: authH,
          body: JSON.stringify({ products: payloadProducts }),
        });
        const data = await res.json();
        if (res.ok) {
          if (Array.isArray(data.failedRows) && data.failedRows.length > 0) {
            const preview = data.failedRows
              .slice(0, 8)
              .map((row: any) => `Line ${row.row}: ${row.error}`)
              .join("\n");
            alert(
              `${data.message || "Import completed with errors."}\n\n${preview}${data.failedRows.length > 8 ? "\n..." : ""}`,
            );
          } else {
            alert(
              data.message || `Successfully imported ${data.count} products.`,
            );
          }
          fetchProducts();
        } else {
          alert(data.error || "Failed to import products.");
        }
      } catch (err: any) {
        alert("Error importing CSV: " + err.message);
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <DashboardLayout userRole={userRole}>
      <CRMPageShell
        title="Invoice Products"
        subtitle="Manage billable products, categories, pricing, and import/export from one place."
        breadcrumb={[
          { label: "CRM", href: "/dashboard/crm" },
          { label: "Products" },
        ]}
        icon={<Box className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-3 bg-white/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-secondary-200">
              <span className="text-[11px] font-semibold text-secondary-500">
                FX Rate
              </span>
              <div className="flex items-center gap-1.5 font-semibold text-sm text-primary-700">
                <span>1 USD = ₹</span>
                <input
                  type="number"
                  step="0.01"
                  className="w-16 bg-transparent outline-none focus:ring-0"
                  value={fxRate}
                  onChange={(e) =>
                    setFxRate(parseFloat(e.target.value) || 83.5)
                  }
                />
              </div>
            </div>
            <div className="flex bg-white/40 backdrop-blur-md rounded-2xl border border-secondary-200 overflow-hidden text-[11px] font-semibold text-secondary-700">
              <button
                onClick={downloadTemplate}
                className="px-4 py-2 hover:bg-white hover:text-primary-600 transition-colors border-r border-secondary-200"
                title="Download CSV Template"
              >
                Template
              </button>
              <label
                className="px-4 py-2 hover:bg-white hover:text-emerald-600 transition-colors border-r border-secondary-200 cursor-pointer flex items-center gap-1.5"
                title="Import CSV"
              >
                <UploadCloud size={14} /> Import
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleImportCSV}
                />
              </label>
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 hover:bg-white hover:text-indigo-600 transition-colors flex items-center gap-1.5"
                title="Export list to CSV"
              >
                <DownloadCloud size={14} /> Export
              </button>
            </div>
            <Link
              href="/dashboard/crm/invoice-products/new"
              className="bg-primary-600 text-white px-8 py-3.5 rounded-2xl text-[12px] font-semibold shadow-2xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center gap-3 active:scale-95 group"
            >
              <Plus
                size={18}
                className="group-hover:rotate-90 transition-transform"
              />
              Add Product
            </Link>
          </div>
        }
      >
        {/* Product Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <CRMStatCard
            label="Total Products"
            value={total}
            icon={<Layers size={22} />}
            accent="bg-primary-950 text-white shadow-primary-100"
            trend={{
              value: "Real-time",
              label: "sync active",
              isPositive: true,
            }}
          />
          <CRMStatCard
            label="Active Products"
            value={products.filter((p) => p.isActive).length}
            icon={<ShieldCheck size={22} />}
            accent="bg-emerald-900 text-white shadow-emerald-100"
            trend={{ value: "Identity", label: "verified", isPositive: true }}
          />
          <CRMStatCard
            label="Featured Products"
            value={products.filter((p) => p.isFeatured).length}
            icon={<Sparkles size={22} />}
            accent="bg-amber-900 text-white shadow-amber-100"
            trend={{ value: "Promotion", label: "ready", isPositive: true }}
          />
          <CRMStatCard
            label="Currency Mode"
            value="Dual-FX"
            icon={<DollarSign size={22} />}
            accent="bg-indigo-900 text-white shadow-indigo-100"
            trend={{ value: "Multi-domain", label: "parity", isPositive: true }}
          />
        </div>

        {/* Currency Converter */}
        <div className="mt-8 bg-secondary-950 p-6 rounded-[2rem] border border-white/5 shadow-xl relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-primary-500/10 to-transparent pointer-events-none" />
          <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-primary-300 group-hover:scale-110 transition-transform">
                <Calculator size={32} />
              </div>
              <div>
                <h3 className="text-[28px] font-semibold text-white tracking-tight leading-none">
                  Currency Converter
                </h3>
                <p className="text-[13px] font-medium text-primary-200/90 mt-2">
                  Convert INR and USD values using your working rate.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-1 max-w-2xl w-full">
              <div className="relative flex-1 group/input">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-400 font-black text-lg group-focus-within/input:text-white transition-colors">
                  {fxCurrency === "INR" ? "₹" : "$"}
                </span>
                <input
                  type="number"
                  className="w-full bg-white/5 border border-white/10 h-16 rounded-[1.2rem] pl-10 pr-6 text-white font-semibold text-lg focus:outline-none focus:bg-white/10 focus:ring-primary-500/20 transition-all placeholder-white/30"
                  placeholder="Enter amount"
                  value={fxInput}
                  onChange={(e) => setFxInput(e.target.value)}
                />
              </div>
              <select
                className="h-16 px-6 bg-white/5 border border-white/10 rounded-[1.2rem] text-white font-semibold text-sm focus:outline-none cursor-pointer"
                value={fxCurrency}
                onChange={(e) => setFxCurrency(e.target.value as "INR" | "USD")}
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
              </select>
              <div className="hidden sm:flex items-center justify-center w-12 text-primary-400">
                <ArrowRight size={24} className="animate-pulse" />
              </div>
              <div className="bg-primary-600 px-8 h-16 rounded-[1.2rem] flex flex-col justify-center min-w-[180px] shadow-2xl shadow-primary-900/50">
                {fxConverted !== null ? (
                  <>
                    <p className="text-white font-semibold text-2xl tracking-tight">
                      {fxCurrency === "INR"
                        ? `$${fxConverted.toFixed(2)}`
                        : `₹${fxConverted.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
                    </p>
                    <p className="text-[10px] font-medium text-white/55 mt-0.5">
                      {fxCurrency === "INR"
                        ? "USD value"
                        : "INR value"}
                    </p>
                  </>
                ) : (
                  <p className="text-white/40 font-semibold text-base tracking-normal">
                    No value yet
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Operations bar */}
        <div className="mt-8 space-y-6">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 border-b border-secondary-100 pb-8">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setCategoryFilter("");
                  setPage(1);
                }}
                className={cn(
                  "px-5 py-2.5 rounded-xl text-[12px] font-semibold transition-all border",
                  categoryFilter === ""
                    ? "bg-secondary-950 text-white border-secondary-950 shadow-xl"
                    : "bg-white text-secondary-500 border-secondary-200 hover:border-primary-300"
                )}
              >
                All Products{" "}
                <span className="ml-2 opacity-40">[{total}]</span>
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => {
                    setCategoryFilter(cat.value);
                    setPage(1);
                  }}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-[12px] font-semibold transition-all border",
                    categoryFilter === cat.value
                      ? "bg-primary-600 text-white border-primary-600 shadow-xl"
                      : "bg-white text-secondary-500 border-secondary-200 hover:shadow-lg"
                  )}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative group">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-300 group-focus-within:text-primary-600 transition-colors"
                  size={18}
                />
                <input
                  className="h-12 w-full sm:w-[320px] bg-secondary-50 border-secondary-100 rounded-2xl pl-12 pr-6 text-sm font-medium text-secondary-950 placeholder-secondary-400 focus:bg-white focus:ring-primary-500/20 transition-all border focus:border-primary-100"
                  placeholder="Search by name, SKU, or domain..."
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="flex items-center gap-2 p-1 bg-secondary-100 rounded-xl">
                <button
                  onClick={() => setSortBy("name")}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    sortBy === "name"
                      ? "bg-white shadow-sm text-primary-600"
                      : "text-secondary-400 hover:text-secondary-600"
                  )}
                >
                  <BarChart3 size={18} />
                </button>
                <button
                  onClick={() => setSortBy("createdAt")}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    sortBy === "createdAt"
                      ? "bg-white shadow-sm text-primary-600"
                      : "text-secondary-400 hover:text-secondary-600"
                  )}
                >
                  <Activity size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {selected.size > 0 && (
            <div className="bg-primary-50 p-4 px-6 rounded-3xl border border-primary-100 flex items-center justify-between animate-in slide-in-from-top-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary-600 text-white rounded-xl flex items-center justify-center font-black text-sm">
                  {selected.size}
                </div>
                <span className="text-[12px] font-semibold text-primary-900">
                  Products selected for bulk update
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={openBulkEdit}
                  className="px-5 py-2 rounded-xl bg-white text-primary-700 border border-primary-100 text-[11px] font-semibold hover:bg-primary-50 transition-all shadow-sm"
                >
                  Bulk Edit
                </button>
                <button
                  onClick={() => handleBulk("ACTIVATE")}
                  className="px-5 py-2 rounded-xl bg-white text-emerald-600 border border-emerald-100 text-[11px] font-semibold hover:bg-emerald-50 transition-all shadow-sm"
                >
                  Activate
                </button>
                <button
                  onClick={() => handleBulk("FEATURE")}
                  className="px-5 py-2 rounded-xl bg-white text-amber-600 border border-amber-100 text-[11px] font-semibold hover:bg-amber-50 transition-all shadow-sm"
                >
                  Mark Featured
                </button>
                <button
                  onClick={() => handleBulk("DELETE")}
                  className="px-5 py-2 rounded-xl bg-white text-danger-600 border border-danger-100 text-[11px] font-semibold hover:bg-danger-50 transition-all shadow-sm"
                >
                  Delete Selected
                </button>
              </div>
            </div>
          )}

          {/* Products */}
          <div className="bg-white rounded-[3rem] border border-secondary-100 shadow-2xl shadow-secondary-100/50 overflow-hidden relative">
            {loading ? (
              <div className="py-40 flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-secondary-300 mt-6">
                  Decrypting registry...
                </span>
              </div>
            ) : products.length === 0 ? (
              <div className="py-40 text-center group">
                <div className="w-24 h-24 bg-secondary-50 text-secondary-200 border border-secondary-100 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 group-hover:rotate-12 transition-transform duration-1000">
                  <Box size={48} strokeWidth={1} />
                </div>
                <h3 className="text-xl font-black text-secondary-900 uppercase tracking-tight">
                  No products found
                </h3>
                <p className="text-sm font-medium text-secondary-500 mt-3">
                  Try clearing filters or add a new product.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-secondary-50/50 border-b border-secondary-100">
                      <th className="p-8 py-5 w-16">
                        <input
                          type="checkbox"
                          checked={
                            selected.size === products.length &&
                            products.length > 0
                          }
                          onChange={selectAll}
                          className="w-5 h-5 rounded-lg border-secondary-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                        />
                      </th>
                      <th className="px-6 py-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary-500">
                        Product
                      </th>
                      <th className="px-6 py-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary-500">
                        Category
                      </th>
                      <th className="px-6 py-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary-500 text-right">
                        INR Price
                      </th>
                      <th className="px-6 py-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary-500 text-right">
                        USD Price
                      </th>
                      <th className="px-6 py-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary-500 text-center">
                        Status
                      </th>
                      <th className="px-8 py-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-secondary-500 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-50">
                    {products.map((p) => {
                      const catCfg = getCatConfig(p.category);
                      return (
                        <tr
                          key={p.id}
                          className={`group hover:bg-secondary-50/50 transition-all duration-500 ${selected.has(p.id) ? "bg-primary-50/30" : ""}`}
                        >
                          <td className="p-8 py-6">
                            <input
                              type="checkbox"
                              checked={selected.has(p.id)}
                              onChange={() => toggleSelect(p.id)}
                              className="w-5 h-5 rounded-lg border-secondary-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex flex-col min-w-[200px]">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-secondary-950 tracking-tight group-hover:text-primary-600 transition-colors">
                                  {p.name}
                                </span>
                                {p.isFeatured && (
                                  <Star
                                    size={12}
                                    className="text-amber-500 fill-amber-500 animate-pulse"
                                  />
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-medium text-secondary-400">
                                  SKU: {p.sku || "NULL_NODE"}
                                </span>
                                <span className="h-1 w-1 bg-secondary-200 rounded-full" />
                                <span className="text-[10px] font-medium text-secondary-400">
                                  {p.unit} unit
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6 font-black uppercase">
                            <span
                              className={`px-4 py-1.5 rounded-full text-[10px] font-semibold tracking-normal border ${catCfg.color.replace("opacity-10", "border-opacity-30")}`}
                            >
                              {catCfg.label}
                            </span>
                          </td>
                          <td className="px-6 py-6 text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-semibold text-secondary-950 text-base">
                                {p.type === "VARIABLE" &&
                                p.variants &&
                                p.variants.length > 0
                                  ? (() => {
                                      const prices = p.variants
                                        .map((v: any) => v.priceINR)
                                        .filter(
                                          (pr: any) =>
                                            pr !== null &&
                                            pr !== undefined &&
                                            pr > 0,
                                        );
                                      if (prices.length === 0)
                                        return FMT_INR(0);
                                      const min = Math.min(...prices);
                                      const max = Math.max(...prices);
                                      if (min === max) return FMT_INR(min);
                                      return (
                                        <div className="flex flex-col items-end">
                                          <span className="text-[9px] text-secondary-400 not-italic font-black leading-none mb-1">
                                            FROM {FMT_INR(min)}
                                          </span>
                                          <span className="text-secondary-950">
                                            {FMT_INR(max)}
                                          </span>
                                        </div>
                                      );
                                    })()
                                  : FMT_INR(p.priceINR || 0)}
                              </span>
                              <p className="text-[10px] font-medium text-secondary-400 mt-1">
                                INR
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-semibold text-indigo-700 text-base">
                                {p.type === "VARIABLE" &&
                                p.variants &&
                                p.variants.length > 0
                                  ? (() => {
                                      const prices = p.variants
                                        .map((v: any) => v.priceUSD)
                                        .filter(
                                          (pr: any) =>
                                            pr !== null &&
                                            pr !== undefined &&
                                            pr > 0,
                                        );
                                      if (prices.length === 0)
                                        return FMT_USD(0);
                                      const min = Math.min(...prices);
                                      const max = Math.max(...prices);
                                      if (min === max) return FMT_USD(min);
                                      return (
                                        <div className="flex flex-col items-end">
                                          <span className="text-[9px] text-indigo-300 not-italic font-black leading-none mb-1">
                                            FROM {FMT_USD(min)}
                                          </span>
                                          <span className="text-indigo-700">
                                            {FMT_USD(max)}
                                          </span>
                                        </div>
                                      );
                                    })()
                                  : FMT_USD(p.priceUSD || 0)}
                              </span>
                              <p className="text-[10px] font-medium text-indigo-300 mt-1">
                                USD
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-center">
                            <CRMBadge
                              variant={p.isActive ? "success" : "secondary"}
                              className="text-[10px] font-semibold border-none"
                              dot
                            >
                              {p.isActive ? "Active" : "Inactive"}
                            </CRMBadge>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEdit(p)}
                                className="p-3 bg-white border border-secondary-100 rounded-xl text-secondary-400 hover:text-primary-600 hover:border-primary-100 hover:shadow-lg transition-all"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(p.id, p.name)}
                                className="p-3 bg-white border border-secondary-100 rounded-xl text-secondary-400 hover:text-danger-600 hover:border-danger-100 hover:shadow-lg transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {total > 0 && (
              <div className="p-8 border-t border-secondary-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-secondary-50/30">
                <div className="flex items-center gap-4">
                  <p className="text-[12px] font-medium text-secondary-500">
                    Showing {(page - 1) * pageSize + 1}–
                    {Math.min(page * pageSize, total)} of {total} products
                  </p>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="h-8 rounded-lg border border-secondary-200 bg-white px-2 text-xs font-medium text-secondary-600 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value={100}>100 per page</option>
                    <option value={300}>300 per page</option>
                    <option value={500}>500 per page</option>
                  </select>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-secondary-200 text-secondary-400 hover:text-primary-600 disabled:opacity-20 transition-all font-black"
                    >
                      <ChevronRight size={18} className="rotate-180" />
                    </button>
                    <span className="text-sm font-semibold text-secondary-900">
                      Page {page}{" "}
                      <span className="mx-2 text-secondary-200">of</span>{" "}
                      {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-secondary-200 text-secondary-400 hover:text-primary-600 disabled:opacity-20 transition-all font-black"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Product Catalogue Modal — new structured form */}
        <CRMModal
          open={showModal}
          onClose={() => setShowModal(false)}
          title={editingProduct ? "Edit Product" : "Add Product to Catalogue"}
          subtitle="Define identity, pricing mode, variants and category."
        >
          <ProductCatalogueForm
            value={catalogueForm}
            onChange={setCatalogueForm}
            onSubmit={(data) => handleSave(data)}
            onCancel={() => setShowModal(false)}
            saving={saving}
            categories={CATEGORIES.map((c) => ({
              value: c.value,
              label: c.label,
              icon: c.icon,
            }))}
          />
        </CRMModal>

        <CRMModal
          open={showBulkEditModal}
          onClose={closeBulkEdit}
          title="Bulk Edit Products"
          subtitle={`Apply shared changes to ${selected.size} selected product${selected.size === 1 ? "" : "s"}. Leave fields blank to keep existing values.`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-secondary-500">
                  Category
                </span>
                <select
                  value={bulkEditForm.category}
                  onChange={(e) =>
                    handleBulkEditField("category", e.target.value)
                  }
                  className="w-full h-11 rounded-xl border border-secondary-200 bg-white px-3.5 text-sm font-medium text-secondary-800"
                >
                  <option value="">No change</option>
                  {CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-secondary-500">
                  Pricing Model
                </span>
                <select
                  value={bulkEditForm.pricingModel}
                  onChange={(e) =>
                    handleBulkEditField("pricingModel", e.target.value)
                  }
                  className="w-full h-11 rounded-xl border border-secondary-200 bg-white px-3.5 text-sm font-medium text-secondary-800"
                >
                  <option value="">No change</option>
                  {PRICING_MODELS.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-secondary-500">
                  Tax Rate
                </span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={bulkEditForm.taxRate}
                  onChange={(e) =>
                    handleBulkEditField("taxRate", e.target.value)
                  }
                  placeholder="No change"
                  className="w-full h-11 rounded-xl border border-secondary-200 bg-white px-3.5 text-sm font-medium text-secondary-800"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-secondary-500">
                  Billing Cycle
                </span>
                <select
                  value={bulkEditForm.billingCycle}
                  onChange={(e) =>
                    handleBulkEditField("billingCycle", e.target.value)
                  }
                  className="w-full h-11 rounded-xl border border-secondary-200 bg-white px-3.5 text-sm font-medium text-secondary-800"
                >
                  <option value="">No change</option>
                  <option value="NULL">Clear billing cycle</option>
                  {BILLING_CYCLES.map((cycle) => (
                    <option key={cycle.value} value={cycle.value}>
                      {cycle.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-secondary-500">
                  Status
                </span>
                <select
                  value={bulkEditForm.isActive}
                  onChange={(e) =>
                    handleBulkEditField("isActive", e.target.value)
                  }
                  className="w-full h-11 rounded-xl border border-secondary-200 bg-white px-3.5 text-sm font-medium text-secondary-800"
                >
                  <option value="">No change</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-secondary-500">
                  Featured
                </span>
                <select
                  value={bulkEditForm.isFeatured}
                  onChange={(e) =>
                    handleBulkEditField("isFeatured", e.target.value)
                  }
                  className="w-full h-11 rounded-xl border border-secondary-200 bg-white px-3.5 text-sm font-medium text-secondary-800"
                >
                  <option value="">No change</option>
                  <option value="true">Featured</option>
                  <option value="false">Not featured</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-secondary-500">
                  Tax Included
                </span>
                <select
                  value={bulkEditForm.taxIncluded}
                  onChange={(e) =>
                    handleBulkEditField("taxIncluded", e.target.value)
                  }
                  className="w-full h-11 rounded-xl border border-secondary-200 bg-white px-3.5 text-sm font-medium text-secondary-800"
                >
                  <option value="">No change</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-secondary-500">
                  Physical Deliverable
                </span>
                <select
                  value={bulkEditForm.isPhysicalDeliverable}
                  onChange={(e) =>
                    handleBulkEditField("isPhysicalDeliverable", e.target.value)
                  }
                  className="w-full h-11 rounded-xl border border-secondary-200 bg-white px-3.5 text-sm font-medium text-secondary-800"
                >
                  <option value="">No change</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-secondary-500">
                  Track Inventory
                </span>
                <select
                  value={bulkEditForm.trackInventory}
                  onChange={(e) =>
                    handleBulkEditField("trackInventory", e.target.value)
                  }
                  className="w-full h-11 rounded-xl border border-secondary-200 bg-white px-3.5 text-sm font-medium text-secondary-800"
                >
                  <option value="">No change</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-secondary-500">
                  Domain
                </span>
                <input
                  type="text"
                  value={bulkEditForm.domain}
                  onChange={(e) =>
                    handleBulkEditField("domain", e.target.value)
                  }
                  placeholder='No change. Use "NULL" to clear.'
                  className="w-full h-11 rounded-xl border border-secondary-200 bg-white px-3.5 text-sm font-medium text-secondary-800"
                />
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-secondary-500">
                Notes
              </span>
              <textarea
                value={bulkEditForm.notes}
                onChange={(e) => handleBulkEditField("notes", e.target.value)}
                placeholder='No change. Use "NULL" to clear.'
                rows={4}
                className="w-full rounded-2xl border border-secondary-200 bg-white px-4 py-3 text-sm font-medium text-secondary-800"
              />
            </label>

            <div className="rounded-2xl border border-secondary-100 bg-secondary-50 px-4 py-3 text-xs text-secondary-500">
              Bulk edit updates shared catalogue metadata and inventory flags. Pricing rows, variants, SKU values, and other product-specific structures still use the regular product editor.
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeBulkEdit}
                className="px-5 py-2.5 rounded-xl border border-secondary-200 text-sm font-semibold text-secondary-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkEditSave}
                disabled={bulkSaving}
                className="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-60"
              >
                {bulkSaving ? "Applying..." : "Apply Changes"}
              </button>
            </div>
          </div>
        </CRMModal>
      </CRMPageShell>
    </DashboardLayout>
  );
}
