type TaxCategory = "PRINT_JOURNAL" | "DIGITAL_ACCESS" | "STANDARD";

type TaxableItemInput = {
  description?: string | null;
  quantity?: number | null;
  price?: number | null;
  amount?: number | null;
  taxRate?: number | null;
  taxCategory?: TaxCategory | string | null;
  productId?: string | null;
  productCategory?: string | null;
  productTags?: string[] | null;
  hsnCode?: string | null;
};

type ProductTaxMetadata = {
  id: string;
  category?: string | null;
  tags?: string[] | null;
  taxRate?: number | null;
};

type CustomerTaxProfile = {
  customerType?: string | null;
  billingCountry?: string | null;
  shippingCountry?: string | null;
  billingState?: string | null;
  shippingState?: string | null;
  billingStateCode?: string | null;
  shippingStateCode?: string | null;
};

type CompanyTaxProfile = {
  stateCode?: string | null;
};

const normalize = (value?: string | null) => (value || "").trim().toLowerCase();

export const normalizeStateCode = (value?: string | null) => {
  const normalized = (value || "").trim().toUpperCase();
  if (!normalized) return "";
  if (/^\d+$/.test(normalized)) return normalized.padStart(2, "0");
  return normalized;
};

export const getCustomerSegmentLabel = (customerType?: string | null) => {
  switch ((customerType || "").toUpperCase()) {
    case "INSTITUTION":
      return "College/University";
    case "AGENCY":
      return "Subscription Agent";
    case "INDIVIDUAL":
      return "Individual Scholar";
    default:
      return "Customer";
  }
};

export const isIndianSupply = (country?: string | null) =>
  normalize(country || "India") === "india";

export const resolveItemTaxCategory = (
  item: TaxableItemInput,
  product?: ProductTaxMetadata | null,
): TaxCategory => {
  const explicit = (item.taxCategory || "").toString().toUpperCase();
  if (
    explicit === "PRINT_JOURNAL" ||
    explicit === "DIGITAL_ACCESS" ||
    explicit === "STANDARD"
  ) {
    return explicit as TaxCategory;
  }

  const tags = [
    ...(item.productTags || []),
    ...(product?.tags || []),
  ]
    .map((tag) => normalize(tag))
    .filter(Boolean);
  const text = [
    item.description,
    item.productCategory,
    product?.category,
  ]
    .map((value) => normalize(value))
    .join(" ");

  const digitalSignals = ["digital", "online", "access", "e-journal", "ejournal"];
  const printSignals = ["print", "print-journal", "journal-print", "hardcopy"];

  const hasDigitalTag = tags.some((tag) =>
    digitalSignals.some((signal) => tag.includes(signal)),
  );
  const hasPrintTag = tags.some((tag) =>
    printSignals.some((signal) => tag.includes(signal)),
  );

  if (
    hasDigitalTag ||
    text.includes("digital") ||
    text.includes("online") ||
    text.includes("access")
  ) {
    return "DIGITAL_ACCESS";
  }

  if (
    hasPrintTag ||
    text.includes("print journal") ||
    text.includes("print subscription") ||
    (text.includes("print") && !text.includes("digital"))
  ) {
    return "PRINT_JOURNAL";
  }

  return "STANDARD";
};

export const getTaxRateForCategory = (
  category: TaxCategory,
  fallbackTaxRate = 18,
) => {
  if (category === "PRINT_JOURNAL") return 0;
  if (category === "DIGITAL_ACCESS") return 18;
  return fallbackTaxRate;
};

export const buildInvoiceTaxContext = (
  customer: CustomerTaxProfile,
  company: CompanyTaxProfile,
) => {
  const country =
    customer.shippingCountry || customer.billingCountry || "India";
  const isDomestic = isIndianSupply(country);
  const placeOfSupplyCode = normalizeStateCode(
    customer.shippingStateCode || customer.billingStateCode,
  );
  const companyStateCode = normalizeStateCode(company.stateCode);
  const isSameStateSupply =
    isDomestic && !!placeOfSupplyCode && !!companyStateCode
      ? placeOfSupplyCode === companyStateCode
      : false;

  return {
    country,
    isDomestic,
    isExport: !isDomestic,
    placeOfSupplyCode,
    companyStateCode,
    isSameStateSupply,
    gstApplicabilityLabel: isDomestic ? "GST Applicable" : "No GST",
    jurisdictionLabel: !isDomestic
      ? "Export / No GST"
      : isSameStateSupply
        ? "CGST (9%), SGST (9%)"
        : "IGST (18%)",
    customerSegmentLabel: getCustomerSegmentLabel(customer.customerType),
    taxNote:
      "TAX NOTE: 0% GST on Print Journals. 18% GST on Online/Digital access.",
  };
};

export const calculateInvoiceTaxBreakdown = ({
  customer,
  company,
  items,
  discountAmount = 0,
  defaultTaxRate = 18,
  productMetadata = new Map<string, ProductTaxMetadata>(),
}: {
  customer: CustomerTaxProfile;
  company: CompanyTaxProfile;
  items: TaxableItemInput[];
  discountAmount?: number;
  defaultTaxRate?: number;
  productMetadata?: Map<string, ProductTaxMetadata>;
}) => {
  const context = buildInvoiceTaxContext(customer, company);
  const subtotal = items.reduce((sum, item) => {
    const baseAmount =
      item.amount ?? Number(item.quantity || 0) * Number(item.price || 0);
    return sum + Number(baseAmount || 0);
  }, 0);
  const taxableSubtotal = Math.max(0, subtotal - Number(discountAmount || 0));

  let totalTax = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  const processedItems = items.map((item) => {
    const product = item.productId ? productMetadata.get(item.productId) : null;
    const category = resolveItemTaxCategory(item, product);
    const baseAmount =
      item.amount ?? Number(item.quantity || 0) * Number(item.price || 0);
    const itemWeight = subtotal > 0 ? Number(baseAmount || 0) / subtotal : 0;
    const itemTaxableAmount = Math.max(
      0,
      Number(baseAmount || 0) - Number(discountAmount || 0) * itemWeight,
    );
    const itemTaxRate = context.isDomestic
      ? getTaxRateForCategory(
          category,
          product?.taxRate ?? Number(item.taxRate ?? defaultTaxRate ?? 18),
        )
      : 0;
    const itemTaxAmount = itemTaxableAmount * (itemTaxRate / 100);

    totalTax += itemTaxAmount;

    if (itemTaxRate > 0) {
      if (context.isSameStateSupply) {
        cgst += itemTaxAmount / 2;
        sgst += itemTaxAmount / 2;
      } else if (context.isDomestic) {
        igst += itemTaxAmount;
      }
    }

    return {
      ...item,
      amount: Number(baseAmount || 0),
      taxableAmount: itemTaxableAmount,
      taxCategory: category,
      taxRate: itemTaxRate,
      taxAmount: itemTaxAmount,
      taxRuleLabel:
        category === "PRINT_JOURNAL"
          ? "0% GST on Print Journals"
          : category === "DIGITAL_ACCESS"
            ? "18% GST on Online/Digital access"
            : context.isDomestic
              ? context.jurisdictionLabel
              : "No GST",
    };
  });

  return {
    ...context,
    subtotal,
    taxableSubtotal,
    tax: totalTax,
    total: taxableSubtotal + totalTax,
    cgst,
    sgst,
    igst,
    cgstRate: context.isDomestic && context.isSameStateSupply ? 9 : 0,
    sgstRate: context.isDomestic && context.isSameStateSupply ? 9 : 0,
    igstRate: context.isDomestic && !context.isSameStateSupply ? 18 : 0,
    effectiveTaxRate:
      taxableSubtotal > 0 ? (totalTax / taxableSubtotal) * 100 : 0,
    lineItems: processedItems,
  };
};
