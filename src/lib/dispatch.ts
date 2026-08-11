import { prisma } from "@/lib/prisma";
import {
  DEFAULT_DISPATCH_PARTNERS,
  normalizeTrackingNumber,
  getDispatchPartnerName,
  buildTrackingMetadata,
  summarizeInvoiceLineItems,
  buildInvoiceFulfillmentPlan,
  deriveDispatchDates,
  resolveAddressForFulfillment,
} from "@/lib/dispatch-core";

// The pure half of this module lives in dispatch-core.ts so it can be unit-tested without a
// database. Re-exported here so every existing `from "@/lib/dispatch"` import keeps working.
export {
  DEFAULT_DISPATCH_PARTNERS,
  normalizeTrackingNumber,
  getDispatchPartnerName,
  buildTrackingMetadata,
  summarizeInvoiceLineItems,
  buildInvoiceFulfillmentPlan,
  deriveDispatchDates,
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
