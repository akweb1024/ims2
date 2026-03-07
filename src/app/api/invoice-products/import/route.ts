import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizedRoute } from "@/lib/middleware-auth";
import { handleApiError, ValidationError } from "@/lib/error-handler";

const db = prisma as any;

const CATEGORIES = [
  "JOURNAL_SUBSCRIPTION",
  "COURSE",
  "WORKSHOP",
  "DOI_SERVICE",
  "APC",
  "CERTIFICATE",
  "DIGITAL_SERVICE",
  "MISC",
];

const parseNumber = (val: string) => {
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
};

export const POST = authorizedRoute(
  ["SUPER_ADMIN", "MANAGER", "FINANCE_ADMIN"],
  async (request: NextRequest, user: any) => {
    try {
      const data = await request.json();
      const rows: any[] = data.products || [];

      if (!rows.length) {
        throw new ValidationError("No products provided for import.");
      }

      let count = 0;
      await db.$transaction(async (tx: any) => {
        for (const row of rows) {
          const name = row.name || row.Name;
          if (!name) continue;

          let category = (row.category || row.Category || "MISC").toUpperCase();
          if (!CATEGORIES.includes(category)) category = "MISC";

          let type = (row.type || row.Type || "SIMPLE").toUpperCase();
          if (type !== "VARIABLE") type = "SIMPLE";

          let pricingModel = (
            row.pricingModel ||
            row.PricingModel ||
            "FIXED"
          ).toUpperCase();
          const pModels = ["FIXED", "TIERED", "VOLUME", "CUSTOM"];
          if (!pModels.includes(pricingModel)) pricingModel = "FIXED";

          const priceINR = parseNumber(
            row.priceINR || row["Price (INR)"] || row.PriceINR || "0",
          );
          const priceUSD = parseNumber(
            row.priceUSD || row["Price (USD)"] || row.PriceUSD || "0",
          );
          const taxRate = parseNumber(row.taxRate || row.TaxRate || "18");
          const hsnCode = row.hsnCode || row["HSN Code"] || row.HSN || null;
          const sacCode = row.sacCode || row["SAC Code"] || row.SAC || null;
          const sku = row.sku || row.SKU || null;

          await tx.invoiceProduct.create({
            data: {
              name,
              type,
              category,
              pricingModel,
              priceINR: type === "VARIABLE" ? 0 : priceINR,
              priceUSD: type === "VARIABLE" ? 0 : priceUSD,
              taxRate,
              hsnCode,
              sacCode,
              sku,
              isActive: true,
              isFeatured: false,
              companyId: user.companyId || null,
              createdById: user.id,
            },
          });
          count++;
        }
      });

      return NextResponse.json({
        message: `Successfully imported ${count} products.`,
        count,
      });
    } catch (error) {
      return handleApiError(error, request.nextUrl.pathname);
    }
  },
);
