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
  productAttributes?: any;
  hsnCode?: string | null;
};

type ProductTaxMetadata = {
  id: string;
  category?: string | null;
  tags?: string[] | null;
  taxRate?: number | null;
  productAttributes?: any;
};

type CustomerTaxProfile = {
  customerType?: string | null;
  organizationType?: string | null;
  institutionType?: string | null;
  institution?: { type?: string | null } | null;
  billingCountry?: string | null;
  shippingCountry?: string | null;
  billingState?: string | null;
  shippingState?: string | null;
  billingStateCode?: string | null;
  shippingStateCode?: string | null;
  currency?: string | null;
};

type CompanyTaxProfile = {
  stateCode?: string | null;
};

const normalize = (value?: string | null) => (value || "").trim().toLowerCase();
const normalizeUpper = (value?: string | null) =>
  (value || "").trim().toUpperCase();

const EDUCATIONAL_SEGMENTS = new Set([
  "INSTITUTION",
  "UNIVERSITY",
  "COLLEGE",
  "SCHOOL",
  "LIBRARY",
  "RESEARCH_INSTITUTE",
]);

export const resolveCustomerTaxSegment = (customer: CustomerTaxProfile) => {
  const rawSegment = normalizeUpper(
    customer.organizationType ||
      customer.customerType ||
      customer.institutionType ||
      customer.institution?.type,
  );

  if (!rawSegment) return "UNKNOWN";
  if (rawSegment === "ORGANIZATION") {
    const institutionHint = normalizeUpper(
      customer.institutionType || customer.institution?.type,
    );
    if (EDUCATIONAL_SEGMENTS.has(institutionHint)) {
      return institutionHint === "UNIVERSITY" ? "UNIVERSITY" : "INSTITUTION";
    }
  }

  if (EDUCATIONAL_SEGMENTS.has(rawSegment)) {
    return rawSegment === "UNIVERSITY" ? "UNIVERSITY" : "INSTITUTION";
  }

  return rawSegment;
};

export const resolveJournalSubscriptionMode = (value?: string | null) => {
  const normalized = normalizeUpper(value)
    .replace(/[\s+-]+/g, "_")
    .replace(/__+/g, "_");

  if (!normalized) return "PRINT";

  if (
    normalized.includes("PRINT_DIGITAL") ||
    normalized.includes("HYBRID")
  ) {
    return "PRINT_DIGITAL";
  }

  if (
    normalized.includes("DIGITAL") ||
    normalized.includes("ONLINE") ||
    normalized.includes("EJOURNAL")
  ) {
    return "DIGITAL";
  }

  if (normalized.includes("PRINT")) {
    return "PRINT";
  }

  return "PRINT";
};

export const normalizeStateCode = (value?: string | null) => {
  const normalized = (value || "").trim().toUpperCase();
  if (!normalized) return "";
  if (/^\d+$/.test(normalized)) return normalized.padStart(2, "0");
  return normalized;
};

export const getCustomerSegmentLabel = (customerType?: string | null) => {
  switch ((customerType || "").toUpperCase()) {
    case "UNIVERSITY":
      return "University";
    case "INSTITUTION":
      return "Institution";
    case "AGENCY":
      return "Agency";
    case "COMPANY":
      return "Company";
    case "INDIVIDUAL":
      return "Individual";
    case "ORGANIZATION":
      return "Organization";
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

const resolveSubscriptionMode = (
  item: TaxableItemInput,
  product?: ProductTaxMetadata | null,
) => {
  const itemMode =
    item?.productAttributes?.subscriptionOptions?.mode ||
    item?.productAttributes?.mode;
  const productMode =
    product?.productAttributes?.subscriptionOptions?.mode ||
    product?.productAttributes?.mode;
  return resolveJournalSubscriptionMode(itemMode || productMode);
};

const isJournalSubscriptionItem = (
  item: TaxableItemInput,
  product?: ProductTaxMetadata | null,
) => {
  const category = normalizeUpper(item.productCategory || product?.category);
  if (category === "JOURNAL_SUBSCRIPTION") return true;
  const text = normalize(
    [item.description, item.productCategory, product?.category].filter(Boolean).join(" "),
  );
  return text.includes("journal");
};


const getJournalDomesticTaxRate = ({
  customer,
  subscriptionMode,
  taxCategory,
}: {
  customer: CustomerTaxProfile;
  subscriptionMode: string;
  taxCategory: string;
}) => {
  const customerSegment = resolveCustomerTaxSegment(customer);

  // Rule 1: Educational accounts (Institutions and Universities) are 0% GST for all journal subscriptions.
  if (customerSegment === "INSTITUTION" || customerSegment === "UNIVERSITY") {
    return 0;
  }

  // Determine if it is strictly a purely Print subscription.
  const normalizedMode = resolveJournalSubscriptionMode(subscriptionMode);
  const isPrintOnly =
    normalizedMode === "PRINT" || taxCategory === "PRINT_JOURNAL";

  // Rule 2: Commercial and standard accounts: 0% for Print, 18% for Digital or Print+Digital.
  if (
    customerSegment === "AGENCY" ||
    customerSegment === "INDIVIDUAL" ||
    customerSegment === "COMPANY" ||
    customerSegment === "ORGANIZATION"
  ) {
    if (isPrintOnly) return 0;
    return 18;
  }

  // Fallback for unknown customer types
  if (isPrintOnly) return 0;
  return 18;
};

export const buildInvoiceTaxContext = (
  customer: CustomerTaxProfile,
  company: CompanyTaxProfile,
) => {
  const country =
    customer.shippingCountry || customer.billingCountry || "India";
  const isCurrencyExport = customer.currency && customer.currency.toUpperCase() !== "INR";
  const isDomestic = isIndianSupply(country) && !isCurrencyExport;
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
    customerSegmentLabel: getCustomerSegmentLabel(
      resolveCustomerTaxSegment(customer),
    ),
    taxNote:
      "TAX NOTE: 0% GST on Print Journals. Educational accounts stay exempt on all journal subscriptions.",
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
    const isJournalSubscription = isJournalSubscriptionItem(item, product);
    const subscriptionMode = resolveSubscriptionMode(item, product);
    const baseAmount =
      item.amount ?? Number(item.quantity || 0) * Number(item.price || 0);
    const itemWeight = subtotal > 0 ? Number(baseAmount || 0) / subtotal : 0;
    const itemTaxableAmount = Math.max(
      0,
      Number(baseAmount || 0) - Number(discountAmount || 0) * itemWeight,
    );
    let itemTaxRate = 0;
    if (context.isDomestic) {
      if (isJournalSubscription) {
        itemTaxRate = getJournalDomesticTaxRate({
          customer,
          subscriptionMode,
          taxCategory: category,
        });
      } else {
        itemTaxRate = getTaxRateForCategory(
          category,
          product?.taxRate ?? Number(item.taxRate ?? defaultTaxRate ?? 18),
        );
      }
    }
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
