// Keep in sync with the Prisma `InvoiceProductCategory` enum (prisma/schema.prisma) — the
// Prisma client itself isn't safe to import into browser bundles, so this list is maintained
// by hand here, but as ONE shared copy instead of duplicated per page. A prior drift where
// this diverged from the backend's own hand-copied enum list caused product creation to fail
// with a 422 for the "Reinste" category (backend never got the value added).
export interface InvoiceProductCategoryOption {
    value: string;
    label: string;
    icon: string;
}

export const INVOICE_PRODUCT_CATEGORIES: InvoiceProductCategoryOption[] = [
    { value: "JOURNAL_SUBSCRIPTION", label: "Journal Subscription", icon: "📰" },
    { value: "COURSE", label: "Course", icon: "🎓" },
    { value: "WORKSHOP", label: "Workshop", icon: "🛠️" },
    { value: "DOI_SERVICE", label: "DOI Service", icon: "🔗" },
    { value: "APC", label: "APC", icon: "📝" },
    { value: "CERTIFICATE", label: "Certificate", icon: "🏅" },
    { value: "DIGITAL_SERVICE", label: "Digital Service", icon: "💻" },
    { value: "REINSTE", label: "Reinste", icon: "🧾" },
    { value: "MISC", label: "Miscellaneous", icon: "📦" },
];
