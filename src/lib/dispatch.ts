import { prisma } from "@/lib/prisma";

export const DEFAULT_DISPATCH_PARTNERS = [
  { name: "India Post", website: "https://www.indiapost.gov.in" },
  { name: "Speed Post", website: "https://www.indiapost.gov.in" },
  { name: "DTDC", website: "https://www.dtdc.in" },
  { name: "Delhivery", website: "https://www.delhivery.com" },
  { name: "Other", website: null },
] as const;

const PARTNER_TRACKING_URLS: Record<string, string> = {
  INDIA_POST:
    "https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx",
  SPEED_POST:
    "https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx",
  DTDC: "https://www.dtdc.in/tracking.asp",
  DELHIVERY: "https://www.delhivery.com/tracking/",
};

const normalizeKey = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_");

export const normalizeTrackingNumber = (value: unknown) => {
  const normalized = String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
  return normalized || null;
};

export const getDispatchPartnerName = (dispatch: {
  partnerName?: string | null;
  courier?: { name?: string | null } | null;
  courierId?: string | null;
}) => dispatch.partnerName || dispatch.courier?.name || null;

const FREQUENCY_CYCLE_MAP: Record<string, number> = {
  ANNUAL: 1,
  YEARLY: 1,
  BI_ANNUAL: 2,
  BIANNUAL: 2,
  TRI_ANNUAL: 3,
  TRIANNUAL: 3,
  BI_MONTHLY: 6,
  BIMONTHLY: 6,
  QUARTERLY: 4,
  MONTHLY: 12,
};

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const normalizeSubscriptionValue = (value: unknown) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

const resolveCycleCount = (frequency: unknown) =>
  FREQUENCY_CYCLE_MAP[normalizeSubscriptionValue(frequency)] || 1;

const resolveModeFlags = (mode: unknown) => {
  const normalized = normalizeSubscriptionValue(mode);
  const hasPrint = normalized.includes("PRINT");
  const hasDigital = normalized.includes("ONLINE") || normalized.includes("DIGITAL");

  if (!normalized) {
    return { print: true, digital: false };
  }

  return {
    print: hasPrint || !hasDigital,
    digital: hasDigital,
  };
};

const resolveAddressForFulfillment = (invoice: any) => {
  const customer = invoice.customerProfile || invoice.subscription?.customerProfile || {};

  return {
    recipientName: customer.organizationName || customer.name || "Customer",
    shippingAddress: invoice.shippingAddress || customer.shippingAddress || null,
    shippingCity: invoice.shippingCity || customer.shippingCity || null,
    shippingState: invoice.shippingState || customer.shippingState || null,
    shippingPincode: invoice.shippingPincode || customer.shippingPincode || null,
    shippingCountry: invoice.shippingCountry || customer.shippingCountry || "India",
    billingAddress: customer.billingAddress || null,
    billingCity: customer.billingCity || customer.city || null,
    billingState: customer.billingState || customer.state || null,
    billingPincode: customer.billingPincode || customer.pincode || null,
    billingCountry: customer.billingCountry || customer.country || "India",
    phone: customer.primaryPhone || null,
  };
};

export const buildTrackingMetadata = (dispatch: {
  trackingNumber?: string | null;
  partnerName?: string | null;
  courier?: { name?: string | null; website?: string | null } | null;
}) => {
  const trackingNumber = normalizeTrackingNumber(dispatch.trackingNumber);
  const partnerName = getDispatchPartnerName(dispatch);
  const partnerKey = partnerName ? normalizeKey(partnerName) : "";
  const trackingUrl =
    trackingNumber && partnerKey && PARTNER_TRACKING_URLS[partnerKey]
      ? PARTNER_TRACKING_URLS[partnerKey]
      : dispatch.courier?.website || null;

  return {
    partnerName,
    trackingNumber,
    trackingUrl,
    canTrack: Boolean(trackingNumber && trackingUrl),
  };
};

export const summarizeInvoiceLineItems = (lineItems: any): Array<Record<string, unknown>> => {
  if (!Array.isArray(lineItems)) return [];

  return lineItems.map((item: any, index: number) => ({
    line: index + 1,
    description:
      item?.description ||
      item?.name ||
      item?.title ||
      item?.invoiceProductName ||
      item?.journal?.name ||
      "Invoice Item",
    quantity:
      Number(item?.quantity || item?.qty || item?.seats || item?.count || 1) || 1,
    sku: item?.sku || item?.invoiceProductSku || null,
    amount:
      Number(item?.total || item?.amount || item?.price || item?.priceINR || 0) || 0,
  }));
};

type FulfillmentPlanRecord = {
  fulfillmentType: "PRINT" | "DIGITAL";
  cycleNumber: number;
  totalCycles: number;
  cycleLabel: string;
  plannedDispatchDate: Date | null;
  accessStartDate: Date | null;
  accessEndDate: Date | null;
  items: Array<Record<string, unknown>>;
};

export const buildInvoiceFulfillmentPlan = (invoice: any): FulfillmentPlanRecord[] => {
  const lineItems = Array.isArray(invoice?.lineItems) ? invoice.lineItems : [];
  const subscriptionStart = invoice?.subscription?.startDate
    ? new Date(invoice.subscription.startDate)
    : new Date(invoice?.createdAt || Date.now());
  const subscriptionEnd = invoice?.subscription?.endDate
    ? new Date(invoice.subscription.endDate)
    : addMonths(subscriptionStart, 12);

  const printCycles = new Map<number, Array<Record<string, unknown>>>();
  const digitalItems: Array<Record<string, unknown>> = [];
  let maxPrintCycles = 0;

  lineItems.forEach((item: any, index: number) => {
    const subscriptionOptions = item?.productAttributes?.subscriptionOptions || {};
    const cycleCount = resolveCycleCount(subscriptionOptions.frequency || item?.billingCycle);
    const mode = resolveModeFlags(subscriptionOptions.mode);
    const summary = {
      line: index + 1,
      description:
        item?.description ||
        item?.name ||
        item?.title ||
        item?.invoiceProductName ||
        item?.journal?.name ||
        "Invoice Item",
      quantity:
        Number(item?.quantity || item?.qty || item?.seats || item?.count || 1) || 1,
      sku: item?.sku || item?.invoiceProductSku || null,
      amount:
        Number(item?.total || item?.amount || item?.price || item?.priceINR || 0) || 0,
      mode: subscriptionOptions.mode || null,
      frequency: subscriptionOptions.frequency || item?.billingCycle || null,
    };

    if (mode.print) {
      maxPrintCycles = Math.max(maxPrintCycles, cycleCount);
      for (let cycle = 1; cycle <= cycleCount; cycle += 1) {
        const bucket = printCycles.get(cycle) || [];
        bucket.push(summary);
        printCycles.set(cycle, bucket);
      }
    }

    if (mode.digital) {
      digitalItems.push(summary);
    }
  });

  const plan: FulfillmentPlanRecord[] = [];

  if (printCycles.size === 0 && digitalItems.length === 0 && lineItems.length > 0) {
    printCycles.set(1, summarizeInvoiceLineItems(lineItems));
    maxPrintCycles = 1;
  }

  for (let cycle = 1; cycle <= maxPrintCycles; cycle += 1) {
    const items = printCycles.get(cycle);
    if (!items || items.length === 0) continue;

    const monthsBetweenCycles = maxPrintCycles > 1 ? Math.floor(12 / maxPrintCycles) : 0;
    plan.push({
      fulfillmentType: "PRINT",
      cycleNumber: cycle,
      totalCycles: maxPrintCycles,
      cycleLabel: maxPrintCycles > 1 ? `Dispatch ${cycle} of ${maxPrintCycles}` : "Print Dispatch",
      plannedDispatchDate: addMonths(subscriptionStart, monthsBetweenCycles * (cycle - 1)),
      accessStartDate: null,
      accessEndDate: null,
      items,
    });
  }

  if (digitalItems.length > 0) {
    plan.push({
      fulfillmentType: "DIGITAL",
      cycleNumber: 1,
      totalCycles: 1,
      cycleLabel: "Digital Access",
      plannedDispatchDate: subscriptionStart,
      accessStartDate: subscriptionStart,
      accessEndDate: subscriptionEnd,
      items: digitalItems,
    });
  }

  return plan;
};

export const deriveDispatchDates = (status: string, existing?: { packedDate?: Date | null; shippedDate?: Date | null; deliveredDate?: Date | null }) => {
  const now = new Date();
  const next = {
    packedDate: existing?.packedDate ?? null,
    shippedDate: existing?.shippedDate ?? null,
    deliveredDate: existing?.deliveredDate ?? null,
  };

  if (status === "PROCESSING" || status === "READY_TO_SHIP") {
    next.packedDate = next.packedDate || now;
  }
  if (status === "SHIPPED" || status === "IN_TRANSIT" || status === "DELIVERED") {
    next.packedDate = next.packedDate || now;
    next.shippedDate = next.shippedDate || now;
  }
  if (status === "DELIVERED") {
    next.deliveredDate = next.deliveredDate || now;
  }

  return next;
};

export async function ensureInvoiceFulfillmentRecords(invoice: any, userId?: string | null) {
  const existing = await prisma.dispatchOrder.findMany({
    where: { invoiceId: invoice.id },
    include: { courier: true, customerProfile: true },
    orderBy: [{ fulfillmentType: "asc" }, { cycleNumber: "asc" }],
  });

  const plan = buildInvoiceFulfillmentPlan(invoice);
  if (plan.length === 0) {
    return existing;
  }

  const address = resolveAddressForFulfillment(invoice);
  const existingKeys = new Set(
    existing.map((record) => `${record.fulfillmentType}:${record.cycleNumber}`),
  );

  for (const record of plan) {
    const key = `${record.fulfillmentType}:${record.cycleNumber}`;
    if (existingKeys.has(key)) continue;

    const isPrint = record.fulfillmentType === "PRINT";
    const hasCompleteShipping =
      Boolean(address.shippingAddress) &&
      Boolean(address.shippingCity) &&
      Boolean(address.shippingState) &&
      Boolean(address.shippingPincode);

    await prisma.dispatchOrder.create({
      data: {
        invoiceId: invoice.id,
        subscriptionId: invoice.subscriptionId || null,
        customerProfileId:
          invoice.customerProfileId || invoice.subscription?.customerProfileId || null,
        fulfillmentType: record.fulfillmentType,
        cycleNumber: record.cycleNumber,
        totalCycles: record.totalCycles,
        cycleLabel: record.cycleLabel,
        plannedDispatchDate: record.plannedDispatchDate,
        accessStartDate: record.accessStartDate,
        accessEndDate: record.accessEndDate,
        recipientName: address.recipientName,
        shippingAddress: isPrint ? address.shippingAddress : null,
        shippingCity: isPrint ? address.shippingCity : null,
        shippingState: isPrint ? address.shippingState : null,
        shippingPincode: isPrint ? address.shippingPincode : null,
        shippingCountry: isPrint ? address.shippingCountry : null,
        billingAddress: isPrint ? address.billingAddress : null,
        billingCity: isPrint ? address.billingCity : null,
        billingState: isPrint ? address.billingState : null,
        billingPincode: isPrint ? address.billingPincode : null,
        billingCountry: isPrint ? address.billingCountry : null,
        phone: address.phone,
        items: record.items as any,
        companyId: invoice.companyId,
        createdByUserId: userId || null,
        updatedByUserId: userId || null,
        remarks:
          isPrint && !hasCompleteShipping
            ? "Shipping details pending on invoice/customer profile."
            : record.fulfillmentType === "DIGITAL"
              ? "Auto-generated digital access record."
              : null,
        status: "PENDING",
      },
    });
  }

  return prisma.dispatchOrder.findMany({
    where: { invoiceId: invoice.id },
    include: { courier: true, customerProfile: true },
    orderBy: [{ fulfillmentType: "asc" }, { cycleNumber: "asc" }],
  });
}

export async function ensureDefaultCouriers() {
  for (const courier of DEFAULT_DISPATCH_PARTNERS) {
    const existing = await prisma.courier.findFirst({
      where: { name: courier.name },
      select: { id: true, isActive: true, website: true },
    });

    if (!existing) {
      await prisma.courier.create({
        data: {
          name: courier.name,
          website: courier.website,
          isActive: true,
        },
      });
      continue;
    }

    if (!existing.isActive || (!existing.website && courier.website)) {
      await prisma.courier.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          website: existing.website || courier.website,
        },
      });
    }
  }
}
