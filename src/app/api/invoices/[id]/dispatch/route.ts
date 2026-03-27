import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizedRoute } from "@/lib/middleware-auth";
import { handleApiError, ValidationError } from "@/lib/error-handler";
import {
  buildInvoiceFulfillmentPlan,
  buildTrackingMetadata,
  deriveDispatchDates,
  ensureInvoiceFulfillmentRecords,
  ensureDefaultCouriers,
  getDispatchPartnerName,
  normalizeTrackingNumber,
} from "@/lib/dispatch";

const getDispatchAddress = (invoice: any) => {
  const customer =
    invoice.customerProfile || invoice.subscription?.customerProfile || {};

  return {
    recipientName:
      customer.organizationName ||
      customer.name ||
      "Customer",
    address:
      invoice.shippingAddress ||
      customer.shippingAddress ||
      customer.billingAddress ||
      "",
    city:
      invoice.shippingCity ||
      customer.shippingCity ||
      customer.billingCity ||
      customer.city ||
      "",
    state:
      invoice.shippingState ||
      customer.shippingState ||
      customer.billingState ||
      customer.state ||
      "",
    pincode:
      invoice.shippingPincode ||
      customer.shippingPincode ||
      customer.billingPincode ||
      customer.pincode ||
      "",
    country:
      invoice.shippingCountry ||
      customer.shippingCountry ||
      customer.billingCountry ||
      customer.country ||
      "India",
    phone:
      customer.primaryPhone ||
      "",
  };
};

const fetchInvoiceForDispatch = async (id: string, companyId?: string | null) => {
  return prisma.invoice.findFirst({
    where: {
      id,
      ...(companyId ? { companyId } : {}),
    },
    include: {
      customerProfile: true,
      subscription: {
        include: {
          customerProfile: true,
        },
      },
      dispatchOrders: {
        include: {
          courier: true,
          customerProfile: true,
        },
        orderBy: [{ fulfillmentType: "asc" }, { cycleNumber: "asc" }],
      },
    },
  });
};

export const GET = authorizedRoute(
  ["SUPER_ADMIN", "ADMIN", "MANAGER", "FINANCE_ADMIN", "EXECUTIVE"],
  async (request: NextRequest, user: any, { params }: any) => {
    try {
      const { id } = await params;
      const invoice = await fetchInvoiceForDispatch(id, user.role === "SUPER_ADMIN" ? undefined : user.companyId);

      if (!invoice) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }

      const dispatchOrders = await ensureInvoiceFulfillmentRecords(invoice, user.id);

      return NextResponse.json(
        dispatchOrders.map((dispatch) => ({
          ...dispatch,
          partnerName: getDispatchPartnerName(dispatch),
          tracking: buildTrackingMetadata(dispatch),
        })),
      );
    } catch (error) {
      return handleApiError(error, request.nextUrl.pathname);
    }
  },
);

export const POST = authorizedRoute(
  ["SUPER_ADMIN", "ADMIN", "MANAGER", "FINANCE_ADMIN", "EXECUTIVE"],
  async (request: NextRequest, user: any, { params }: any) => {
    try {
      const { id } = await params;
      await ensureDefaultCouriers();
      const invoice = await fetchInvoiceForDispatch(id, user.role === "SUPER_ADMIN" ? undefined : user.companyId);

      if (!invoice) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }

      const address = getDispatchAddress(invoice);
      const plan = buildInvoiceFulfillmentPlan(invoice);
      const requiresPrintShipping = plan.some((record) => record.fulfillmentType === "PRINT");
      const missingFields = requiresPrintShipping
        ? [
            !address.address ? "shippingAddress" : null,
            !address.city ? "shippingCity" : null,
            !address.state ? "shippingState" : null,
            !address.pincode ? "shippingPincode" : null,
          ].filter(Boolean)
        : [];

      if (missingFields.length > 0) {
        throw new ValidationError(
          "Shipping address is incomplete. Please complete invoice or customer shipping details first.",
          { missingFields, resolvedAddress: address },
        );
      }

      const dispatchOrders = await ensureInvoiceFulfillmentRecords(invoice, user.id);

      return NextResponse.json(
        dispatchOrders.map((dispatch) => ({
          ...dispatch,
          partnerName: getDispatchPartnerName(dispatch),
          tracking: buildTrackingMetadata(dispatch),
        })),
      );
    } catch (error) {
      return handleApiError(error, request.nextUrl.pathname);
    }
  },
);

export const PATCH = authorizedRoute(
  ["SUPER_ADMIN", "ADMIN", "MANAGER", "FINANCE_ADMIN", "EXECUTIVE"],
  async (request: NextRequest, user: any, { params }: any) => {
    try {
      const { id } = await params;
      const body = await request.json();

      const invoice = await fetchInvoiceForDispatch(id, user.role === "SUPER_ADMIN" ? undefined : user.companyId);
      if (!invoice) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }

      const dispatchId = body.dispatchId || invoice.dispatchOrders?.[0]?.id;
      const currentDispatch = invoice.dispatchOrders?.find((dispatch: any) => dispatch.id === dispatchId);
      if (!currentDispatch) {
        return NextResponse.json({ error: "Dispatch record not found for this invoice" }, { status: 404 });
      }

      const nextStatus = body.status || currentDispatch.status;
      const dates = deriveDispatchDates(nextStatus, currentDispatch);
      const trackingNumber = body.trackingNumber !== undefined
        ? normalizeTrackingNumber(body.trackingNumber)
        : undefined;

      const updated = await prisma.dispatchOrder.update({
        where: { id: currentDispatch.id },
        data: {
          courierId: body.courierId !== undefined ? body.courierId || null : undefined,
          partnerName: body.partnerName !== undefined ? String(body.partnerName || "").trim() || null : undefined,
          trackingNumber,
          status: body.status || undefined,
          remarks: body.remarks !== undefined ? String(body.remarks || "").trim() || null : undefined,
          packedDate: body.packedDate ? new Date(body.packedDate) : dates.packedDate,
          shippedDate: body.shippedDate ? new Date(body.shippedDate) : dates.shippedDate,
          deliveredDate: body.deliveredDate ? new Date(body.deliveredDate) : dates.deliveredDate,
          updatedByUserId: user.id,
        },
        include: {
          courier: true,
          customerProfile: true,
        },
      });

      return NextResponse.json({
        ...updated,
        partnerName: getDispatchPartnerName(updated),
        tracking: buildTrackingMetadata(updated),
      });
    } catch (error) {
      return handleApiError(error, request.nextUrl.pathname);
    }
  },
);
