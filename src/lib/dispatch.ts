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
