import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizedRoute } from "@/lib/middleware-auth";
import { handleApiError, ValidationError } from "@/lib/error-handler";
import { logger } from "@/lib/logger";
import { resolveLeadOwner } from "@/lib/crm/lead-assignment";
import { z } from "zod";

const createLeadSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  primaryEmail: z.string().email("Valid email required"),
  primaryPhone: z.string().optional(),
  organizationName: z.string().optional(),
  status: z
    .enum([
      "NEW",
      "CONTACTED",
      "QUALIFIED",
      "PROPOSAL_SENT",
      "NEGOTIATION",
      "CONVERTED",
      "LOST",
    ])
    .optional()
    .default("NEW"),
  score: z.number().optional().default(0),
  source: z.string().optional().default("DIRECT"),
  assignedToUserId: z.string().optional().nullable(),
  notes: z.string().optional(),
});

export const GET = authorizedRoute(
  ["SUPER_ADMIN", "ADMIN", "MANAGER", "TEAM_LEADER", "EXECUTIVE"],
  async (req: NextRequest, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const search = searchParams.get("search") || "";
      const status = searchParams.get("status");
      const limit = parseInt(searchParams.get("limit") || "10");
      const page = parseInt(searchParams.get("page") || "1");
      const skip = (page - 1) * limit;

      const assignedToUserId = searchParams.get("assignedToUserId");

      const isGlobal = [
        "SUPER_ADMIN",
        "ADMIN",
        "MANAGER",
        "TEAM_LEADER",
      ].includes(user.role);

      const where: any = {
        companyId: user.companyId,
        leadStatus: { not: null },
        ...(!isGlobal
          ? { assignedToUserId: user.id }
          : assignedToUserId
            ? { assignedToUserId }
            : {}),
        ...(status && { leadStatus: status }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { primaryEmail: { contains: search, mode: "insensitive" } },
            { organizationName: { contains: search, mode: "insensitive" } },
          ],
        }),
      };

      const [leads, total] = await Promise.all([
        prisma.customerProfile.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            assignedTo: { select: { id: true, name: true, email: true } },
            _count: { select: { deals: true } },
          },
        }),
        prisma.customerProfile.count({ where }),
      ]);

      return NextResponse.json({
        data: leads,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      return handleApiError(error, req.nextUrl.pathname);
    }
  },
);

export const POST = authorizedRoute(
  ["SUPER_ADMIN", "ADMIN", "MANAGER", "TEAM_LEADER", "EXECUTIVE"],
  async (req: NextRequest, user) => {
    try {
      const body = await req.json();
      const validatedData = createLeadSchema.parse(body);

      // Check if user already exists with this email
      let leadUser = await prisma.user.findUnique({
        where: { email: validatedData.primaryEmail },
      });

      if (!leadUser) {
        leadUser = await prisma.user.create({
          data: {
            email: validatedData.primaryEmail,
            name: validatedData.name,
            password: "TEMP_PASSWORD_" + Date.now(),
            role: "CUSTOMER",
            companyId: user.companyId,
            isActive: true,
          },
        });
      }

      const assignedOwnerId = await resolveLeadOwner({
        companyId: user.companyId,
        preferredUserId: validatedData.assignedToUserId,
        fallbackUserId: user.id,
        changedByUserId: user.id,
      });

      const lead = await prisma.customerProfile.create({
        data: {
          userId: leadUser.id,
          companyId: user.companyId,
          customerType: "INDIVIDUAL",
          name: validatedData.name,
          primaryEmail: validatedData.primaryEmail,
          primaryPhone: validatedData.primaryPhone || "",
          organizationName: validatedData.organizationName,
          leadStatus: validatedData.status,
          leadScore: validatedData.score,
          source: validatedData.source,
          assignedToUserId: assignedOwnerId || undefined,
          notes: validatedData.notes,
        },
      });

      logger.info("CRM lead created", { leadId: lead.id, createdBy: user.id });

      return NextResponse.json(lead, { status: 201 });
    } catch (error) {
      return handleApiError(error, req.nextUrl.pathname);
    }
  },
);
