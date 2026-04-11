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

const parseBoolean = (val: any, fallback = false) => {
  if (val === undefined || val === null || String(val).trim() === "") {
    return fallback;
  }
  const normalized = String(val).trim().toLowerCase();
  return ["true", "1", "yes", "y", "active"].includes(normalized);
};

const normalizeCategory = (input: any) => {
  const raw = String(input || "MISC").trim().toUpperCase().replace(/\s+/g, "_");
  return CATEGORIES.includes(raw) ? raw : "MISC";
};

const normalizePricingModel = (input: any) => {
  const raw = String(input || "FIXED").trim().toUpperCase().replace(/\s+/g, "_");
  const valid = ["FIXED", "TIERED", "VOLUME", "CUSTOM"];
  return valid.includes(raw) ? raw : "FIXED";
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
      const failedRows: Array<{ row: number; name?: string; error: string }> = [];
      await db.$transaction(async (tx: any) => {
        for (let index = 0; index < rows.length; index++) {
          const row = rows[index];
          const name = row.name || row.Name;
          if (!name || !String(name).trim()) continue;

          const category = normalizeCategory(row.category || row.Category);

          let type = (row.type || row.Type || "SIMPLE").toUpperCase();
          if (type !== "VARIABLE") type = "SIMPLE";

          const pricingModel = normalizePricingModel(
            row.pricingModel || row.PricingModel || row["Pricing Model"],
          );

          const priceINR = parseNumber(
            row.priceINR || row["Price (INR)"] || row.PriceINR || "0",
          );
          const priceUSD = parseNumber(
            row.priceUSD || row["Price (USD)"] || row.PriceUSD || "0",
          );
          const taxRate = parseNumber(row.taxRate || row.TaxRate || "18");
          const hsnCode = row.hsnCode || row["HSN Code"] || row.HSN || null;
          const sacCode = row.sacCode || row["SAC Code"] || row.SAC || null;
          const sku = row.sku || row.SKU || row["Sku"] || null;
          const domain = row.domain || row.Domain || row["Domain / Industry"] || null;
          const subscriptionFrequency =
            row.subscriptionFrequency || row["Subscription Frequency"] || null;
          const subscriptionYearRaw =
            row.subscriptionYear || row["Subscription Year"] || null;
          const subscriptionMode =
            row.subscriptionMode || row["Subscription Mode"] || null;
          const subscriptionPublisher =
            row.subscriptionPublisher || row["Subscription Publisher"] || null;
          const notes = row.notes || row.Notes || null;
          const taxIncluded = parseBoolean(
            row.taxIncluded || row["Tax Included"],
            false,
          );
          const isActive = parseBoolean(
            row.isActive || row.Status,
            true,
          );
          const isFeatured = parseBoolean(
            row.isFeatured || row["Is Featured"],
            false,
          );
          const tags = String(row.tags || row.Tags || "")
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean);

          const productAttributes =
            category === "JOURNAL_SUBSCRIPTION" &&
            (subscriptionFrequency || subscriptionYearRaw || subscriptionMode || subscriptionPublisher)
              ? {
                  subscriptionOptions: {
                    frequency: (subscriptionFrequency || "ANNUAL").toUpperCase(),
                    year: subscriptionYearRaw
                      ? parseInt(subscriptionYearRaw, 10)
                      : new Date().getFullYear(),
                    mode: (subscriptionMode || "PRINT").toUpperCase().replace(
                      /\s*\+\s*/g,
                      "_",
                    ),
                    publisher: subscriptionPublisher || "Stm Journals",
                  },
                }
              : undefined;

          try {
            await tx.invoiceProduct.create({
              data: {
                name: String(name).trim(),
                type,
                category,
                pricingModel,
                priceINR: type === "VARIABLE" ? 0 : priceINR,
                priceUSD: type === "VARIABLE" ? 0 : priceUSD,
                taxRate,
                taxIncluded,
                hsnCode,
                sacCode,
                sku: sku ? String(sku).trim() : null,
                domain: domain ? String(domain).trim() : null,
                notes,
                productAttributes,
                tags,
                isActive,
                isFeatured,
                companyId: user.companyId || null,
                createdByUserId: user.id,
              },
            });
            count++;
          } catch (rowError: any) {
            failedRows.push({
              row: index + 2, // +2 for CSV line number with header
              name: String(name),
              error: rowError?.message || "Unknown row error",
            });
          }
        }
      });

      return NextResponse.json({
        message:
          failedRows.length > 0
            ? `Imported ${count} products with ${failedRows.length} failed row(s).`
            : `Successfully imported ${count} products.`,
        count,
        failedRows,
      });
    } catch (error) {
      return handleApiError(error, request.nextUrl.pathname);
    }
  },
);
