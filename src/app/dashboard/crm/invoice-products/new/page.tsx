"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CRMClientLayout from "../../CRMClientLayout";
import { CRMPageShell } from "@/components/crm/CRMPageShell";
import ProductCatalogueForm, {
  DEFAULT_FORM_DATA,
  type ProductCatalogueFormData,
} from "@/components/dashboard/crm/ProductCatalogueForm";
import { showError, showSuccess } from "@/lib/toast";
import { ArrowLeft, PackagePlus } from "lucide-react";

const buildPayload = (form: ProductCatalogueFormData) => {
  const isVariable = form.pricingMode === "VARIABLE";
  return {
    name: form.name.trim(),
    type: isVariable ? "VARIABLE" : "SIMPLE",
    category: form.category || "MISC",
    pricingModel: isVariable ? "CUSTOM" : "FIXED",
    description: null,
    shortDesc: null,
    priceINR: isVariable ? 0 : Number(form.fixedPriceINR) || 0,
    priceUSD: isVariable ? 0 : Number(form.fixedPriceUSD) || 0,
    taxRate: 18,
    taxIncluded: false,
    hsnCode: form.hsnCode || null,
    sacCode: form.sacCode || null,
    billingCycle: null,
    unit: "unit",
    minQuantity: 1,
    maxQuantity: null,
    sku: form.sku || null,
    isActive: true,
    isFeatured: false,
    tags: [],
    notes: null,
    domain: form.domain || null,
    attributes: null,
    priceTiers: null,
    variants: isVariable
      ? form.variants
          .filter((v) => v.name)
          .map((v) => ({
            sku: v.name,
            priceINR: Number(v.priceINR) || 0,
            priceUSD: Number(v.priceUSD) || 0,
            isActive: true,
            attributes: { year: v.year, duration: v.duration },
          }))
      : [],
  };
};

export default function NewInvoiceProductPage() {
  const router = useRouter();
  const [form, setForm] = useState<ProductCatalogueFormData>(
    DEFAULT_FORM_DATA,
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (data: ProductCatalogueFormData) => {
    if (!data.name.trim()) {
      showError("Product name is required");
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/invoice-products", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPayload(data)),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || err?.error || "Failed to save product");
      }
      showSuccess("Product added to catalogue");
      router.push("/dashboard/crm/invoice-products");
    } catch (e: any) {
      showError(e.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CRMClientLayout>
      <CRMPageShell
        title="Add Product"
        subtitle="Create a new product in the catalogue."
        breadcrumb={[
          { label: "CRM", href: "/dashboard/crm" },
          { label: "Products", href: "/dashboard/crm/invoice-products" },
          { label: "Add Product" },
        ]}
        icon={<PackagePlus className="w-5 h-5" />}
        actions={
          <button
            onClick={() => router.push("/dashboard/crm/invoice-products")}
            className="flex items-center gap-2.5 px-6 py-3 bg-secondary-50 text-secondary-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-secondary-200 hover:bg-white hover:text-secondary-900 transition-all shadow-sm"
          >
            <ArrowLeft size={14} /> Back to Products
          </button>
        }
      >
        <div className="max-w-5xl mx-auto">
          <ProductCatalogueForm
            value={form}
            onChange={setForm}
            onSubmit={handleSubmit}
            onCancel={() => router.push("/dashboard/crm/invoice-products")}
            saving={saving}
          />
        </div>
      </CRMPageShell>
    </CRMClientLayout>
  );
}
