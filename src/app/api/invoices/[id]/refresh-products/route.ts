import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizedRoute } from "@/lib/middleware-auth";
import { handleApiError, ValidationError } from "@/lib/error-handler";
import { logger } from "@/lib/logger";

const db = prisma as any;

export const POST = authorizedRoute(
  ["SUPER_ADMIN", "ADMIN", "MANAGER", "FINANCE_ADMIN"],
  async (request: NextRequest, user: any, context?: any) => {
    try {
      const { id } = await context.params;

      const invoice = await db.invoice.findFirst({
        where: { id, companyId: user.companyId },
      });

      if (!invoice) throw new ValidationError("Invoice not found");
      if (invoice.status === "PAID")
        throw new ValidationError("Cannot update a PAID invoice.");

      // Fetch current product catalog details for all linked products
      const productIds = Array.from(
        new Set(
          invoice.lineItems.map((item: any) => item.productId).filter(Boolean),
        ),
      );
      const variantIds = Array.from(
        new Set(
          invoice.lineItems.map((item: any) => item.variantId).filter(Boolean),
        ),
      );

      if (productIds.length === 0 && variantIds.length === 0) {
        return NextResponse.json({
          message: "No catalogue products found on this invoice to sync.",
          updated: 0,
        });
      }

      const products = await db.invoiceProduct.findMany({
        where: { id: { in: productIds as string[] } },
      });
      const variants = await db.productVariant.findMany({
        where: { id: { in: variantIds as string[] } },
        include: { product: true },
      });

      const productMap = new Map(products.map((p: any) => [p.id, p]));
      const variantMap = new Map(variants.map((v: any) => [v.id, v]));

      let updatedCount = 0;
      const updatedItems = invoice.lineItems.map((item: any) => {
        const updated = { ...item };

        if (item.variantId && variantMap.has(item.variantId)) {
          const v: any = variantMap.get(item.variantId);
          const p = v.product;
          const price =
            invoice.currency === "USD"
              ? (v.priceUSD ?? p.priceUSD ?? 0)
              : (v.priceINR ?? p.priceINR ?? 0);
          const name = `${p.name} (${Object.values(v.attributes || {}).join(", ")})`;
          const finalDesc = v.sku ? `${name} (${v.sku})` : name;

          if (
            updated.price !== price ||
            updated.description !== finalDesc ||
            updated.hsnCode !== (p.hsnCode || p.sacCode || "")
          ) {
            updated.price = price;
            updated.description = finalDesc;
            updated.hsnCode = p.hsnCode || p.sacCode || "";
            updatedCount++;
          }
        } else if (item.productId && productMap.has(item.productId)) {
          const p: any = productMap.get(item.productId);
          const price = invoice.currency === "USD" ? p.priceUSD : p.priceINR;
          const finalDesc = p.sku ? `${p.name} (${p.sku})` : p.name;

          if (
            updated.price !== price ||
            updated.description !== finalDesc ||
            updated.hsnCode !== (p.hsnCode || p.sacCode || "")
          ) {
            updated.price = price;
            updated.description = finalDesc;
            updated.hsnCode = p.hsnCode || p.sacCode || "";
            updatedCount++;
          }
        }

        updated.total = updated.price * updated.quantity;
        return updated;
      });

      if (updatedCount === 0) {
        return NextResponse.json({
          message: "All items are already up to date with the catalogue.",
          updated: 0,
        });
      }

      // Recalculate totals
      const subtotal = updatedItems.reduce(
        (acc: number, item: any) => acc + (item.total || 0),
        0,
      );

      // Reapply existing discount if any
      let discountAmount = 0;
      if (invoice.discountType === "PERCENTAGE") {
        discountAmount = subtotal * ((invoice.discountValue || 0) / 100);
      } else if (invoice.discountType === "FIXED") {
        discountAmount = Math.min(invoice.discountValue || 0, subtotal);
      }

      const taxableAmount = Math.max(0, subtotal - discountAmount);
      const taxAmount = taxableAmount * ((invoice.taxRate || 0) / 100);
      const total = taxableAmount + taxAmount;

      const updatedInvoice = await db.$transaction(async (tx: any) => {
        const updated = await tx.invoice.update({
          where: { id },
          data: {
            lineItems: updatedItems,
            amount: subtotal,
            tax: taxAmount,
            total: total,
            discountAmount: discountAmount,
            updatedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: "SYNC_CATALOGUE_PRICES",
            entity: "Invoice",
            entityId: id,
            changes: {
              updatedItemsCount: updatedCount,
              oldTotal: invoice.total,
              newTotal: total,
            },
          },
        });

        return updated;
      });

      logger.info("Invoice synced with catalogue", {
        invoiceId: id,
        updatedItemsCount: updatedCount,
        oldTotal: invoice.total,
        newTotal: total,
      });

      return NextResponse.json({
        message: `Successfully synchronized ${updatedCount} items with the latest catalogue data.`,
        updated: updatedCount,
        invoice: updatedInvoice,
      });
    } catch (error) {
      return handleApiError(error, request.nextUrl.pathname);
    }
  },
);
