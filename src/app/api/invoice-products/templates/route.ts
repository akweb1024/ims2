import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizedRoute } from "@/lib/middleware-auth";
import { handleApiError, ValidationError } from "@/lib/error-handler";
import { z } from "zod";

const db = prisma as any;

const templateVariantSchema = z.object({
  name: z.string().min(1),
  priceINR: z.number().min(0),
  priceUSD: z.number().min(0),
  year: z.number().int().optional().nullable(),
  duration: z.string().optional().nullable(),
});

const templateCreateSchema = z.object({
  name: z.string().min(1),
  category: z.string(),
  variants: z.array(templateVariantSchema).min(1),
});

export const GET = authorizedRoute(
  ["SUPER_ADMIN", "MANAGER", "FINANCE_ADMIN", "EXECUTIVE"],
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const category = searchParams.get("category");

      const where: any = {};
      if (category) where.category = category;

      const templates = await db.productPricingTemplate.findMany({
        where,
        include: {
          variants: {
            orderBy: { name: 'asc' }
          },
        },
        orderBy: { name: "asc" },
      });

      return NextResponse.json(templates);
    } catch (error) {
      return handleApiError(error, request.nextUrl.pathname);
    }
  }
);

export const POST = authorizedRoute(
  ["SUPER_ADMIN", "MANAGER", "FINANCE_ADMIN"],
  async (request: NextRequest) => {
    try {
      const body = await request.json();
      const parsed = templateCreateSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
          { status: 422 }
        );
      }

      const { name, category, variants } = parsed.data;

      const template = await db.$transaction(async (tx: any) => {
        return tx.productPricingTemplate.create({
          data: {
            name,
            category: category as any,
            variants: {
              create: variants.map((v) => ({
                name: v.name,
                priceINR: v.priceINR,
                priceUSD: v.priceUSD,
                year: v.year,
                duration: v.duration,
              })),
            },
          },
          include: { variants: true },
        });
      });

      return NextResponse.json(template, { status: 201 });
    } catch (error) {
      return handleApiError(error, request.nextUrl.pathname);
    }
  }
);

export const DELETE = authorizedRoute(
  ["SUPER_ADMIN", "MANAGER", "FINANCE_ADMIN"],
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get("id");

      if (!id) {
        throw new ValidationError("Template ID is required");
      }

      await db.productPricingTemplate.delete({
        where: { id },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      return handleApiError(error, request.nextUrl.pathname);
    }
  }
);
