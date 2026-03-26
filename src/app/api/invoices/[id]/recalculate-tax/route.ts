import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizedRoute } from "@/lib/middleware-auth";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/error-handler";
import { calculateInvoiceTaxBreakdown } from "@/lib/invoice-tax";

export const POST = authorizedRoute(
  ["SUPER_ADMIN", "ADMIN", "MANAGER", "FINANCE_ADMIN"],
  async (req: NextRequest, user, { params }) => {
    try {
      const { id } = await params;

      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          customerProfile: {
            include: {
              institution: {
                select: { type: true },
              },
            },
          },
          company: {
            select: {
              id: true,
              stateCode: true,
            },
          },
        },
      });

      if (!invoice) throw new NotFoundError("Invoice");
      if (!invoice.customerProfileId || !invoice.customerProfile) {
        throw new ValidationError(
          "Invoice is not linked to a customer profile. Tax recalculation is unavailable.",
        );
      }
      if (!Array.isArray(invoice.lineItems) || invoice.lineItems.length === 0) {
        throw new ValidationError(
          "Invoice has no line items. Tax recalculation is unavailable.",
        );
      }
      if (invoice.status === "PAID") {
        throw new ValidationError(
          "Invoices marked as PAID cannot be modified. Void and recreate if needed.",
        );
      }

      const lineItems = invoice.lineItems as any[];
      const productIds = Array.from(
        new Set(
          lineItems
            .map((item: any) => item?.productId)
            .filter((value: any): value is string => typeof value === "string" && value.length > 0),
        ),
      );

      const productMetadata = new Map<
        string,
        {
          id: string;
          category?: string | null;
          tags?: string[] | null;
          taxRate?: number | null;
          productAttributes?: any;
        }
      >();

      if (productIds.length > 0) {
        const products = await prisma.invoiceProduct.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            category: true,
            tags: true,
            taxRate: true,
            productAttributes: true,
          },
        });

        products.forEach((product) => {
          productMetadata.set(product.id, {
            id: product.id,
            category: product.category,
            tags: Array.isArray(product.tags) ? (product.tags as string[]) : [],
            taxRate: product.taxRate,
            productAttributes: product.productAttributes,
          });
        });
      }

      const customer = invoice.customerProfile;
      const mergedCustomerTaxProfile = {
        ...customer,
        billingCountry: invoice.billingCountry || customer.billingCountry,
        shippingCountry: invoice.shippingCountry || customer.shippingCountry,
        billingState: invoice.billingState || customer.billingState,
        shippingState: invoice.shippingState || customer.shippingState,
        billingStateCode: invoice.billingStateCode || customer.billingStateCode,
        shippingStateCode: invoice.shippingStateCode || customer.shippingStateCode,
        institutionType: customer.institution?.type || null,
      };

      const taxBreakdown = calculateInvoiceTaxBreakdown({
        customer: mergedCustomerTaxProfile,
        company: { stateCode: invoice.companyStateCode || invoice.company?.stateCode },
        items: lineItems,
        discountAmount: Number(invoice.discountAmount || 0),
        defaultTaxRate: Number(invoice.taxRate || 18),
        productMetadata,
      });

      const updated = await prisma.invoice.update({
        where: { id },
        data: {
          amount: taxBreakdown.subtotal,
          tax: taxBreakdown.tax,
          total: taxBreakdown.total,
          taxRate: taxBreakdown.effectiveTaxRate,
          lineItems: taxBreakdown.lineItems,
          companyStateCode: taxBreakdown.companyStateCode || invoice.companyStateCode,
          placeOfSupplyCode: taxBreakdown.placeOfSupplyCode || invoice.placeOfSupplyCode,
          cgst: taxBreakdown.cgst,
          sgst: taxBreakdown.sgst,
          igst: taxBreakdown.igst,
          cgstRate: taxBreakdown.cgstRate,
          sgstRate: taxBreakdown.sgstRate,
          igstRate: taxBreakdown.igstRate,
          updatedAt: new Date(),
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "RECALCULATE_INVOICE_TAX",
          entity: "Invoice",
          entityId: id,
          changes: {
            previousTax: invoice.tax,
            recalculatedTax: updated.tax,
            previousTotal: invoice.total,
            recalculatedTotal: updated.total,
          },
        },
      });

      return NextResponse.json({
        message: "Invoice tax recalculated successfully",
        invoice: updated,
      });
    } catch (error) {
      return handleApiError(error, req.nextUrl.pathname);
    }
  },
);

