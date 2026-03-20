import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, AuthorizationError, NotFoundError, ConflictError } from "@/lib/error-handler";
import { logger } from "@/lib/logger";
import { resolveLeadOwner } from "@/lib/crm/lead-assignment";
import { z } from "zod";

const publicLeadSchema = z.object({
  companyId: z.string().uuid("Valid companyId is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional().nullable(),
  organizationName: z.string().optional().nullable(),
  source: z.string().optional().default("WEBSITE"),
  notes: z.string().optional().nullable(),
  assignedToUserId: z.string().uuid().optional().nullable(),
  score: z.number().int().min(0).max(100).optional().default(0),
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
  formName: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  customFields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

function getWebhookSecret(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return req.headers.get("x-webhook-secret");
}

function buildNotes(data: z.infer<typeof publicLeadSchema>) {
  const lines: string[] = [];

  if (data.website) lines.push(`Website: ${data.website}`);
  if (data.formName) lines.push(`Form: ${data.formName}`);
  if (data.tags.length > 0) lines.push(`Tags: ${data.tags.join(", ")}`);
  if (data.notes) lines.push(`Notes: ${data.notes}`);

  if (data.customFields && Object.keys(data.customFields).length > 0) {
    lines.push("Custom Fields:");
    for (const [key, value] of Object.entries(data.customFields)) {
      lines.push(`- ${key}: ${String(value ?? "")}`);
    }
  }

  return lines.join("\n").trim() || null;
}

export async function GET() {
  return NextResponse.json({
    name: "Public Lead Capture Webhook",
    method: "POST",
    path: "/api/public/leads",
    auth: "Authorization: Bearer <LEAD_WEBHOOK_SECRET> or x-webhook-secret header",
    requiredFields: ["companyId", "name", "email"],
    optionalFields: [
      "phone",
      "organizationName",
      "source",
      "notes",
      "assignedToUserId",
      "score",
      "status",
      "formName",
      "website",
      "tags",
      "customFields",
    ],
  });
}

export async function POST(req: NextRequest) {
  try {
    const expectedSecret = process.env.LEAD_WEBHOOK_SECRET;
    const receivedSecret = getWebhookSecret(req);

    if (!expectedSecret) {
      throw new AuthorizationError("Lead webhook is not configured");
    }

    if (receivedSecret !== expectedSecret) {
      logger.security("Invalid lead webhook secret", {
        path: req.nextUrl.pathname,
        ip:
          req.headers.get("x-forwarded-for") ||
          req.headers.get("x-real-ip") ||
          "unknown",
      });
      throw new AuthorizationError("Invalid webhook secret");
    }

    const body = await req.json();
    const data = publicLeadSchema.parse(body);

    const company = await prisma.company.findUnique({
      where: { id: data.companyId },
      select: { id: true, name: true },
    });

    if (!company) {
      throw new NotFoundError("Company");
    }

    const normalizedEmail = data.email.trim().toLowerCase();
    const normalizedPhone = data.phone?.trim() || "";
    const combinedNotes = buildNotes(data);
    const assignedOwnerId = await resolveLeadOwner({
      companyId: company.id,
      preferredUserId: data.assignedToUserId,
      fallbackUserId: null,
      changedByUserId: null,
    });

    const existingProfile = await prisma.customerProfile.findFirst({
      where: {
        companyId: company.id,
        primaryEmail: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
    });

    if (existingProfile) {
      const updatedLead = await prisma.customerProfile.update({
        where: { id: existingProfile.id },
        data: {
          name: data.name,
          primaryPhone: normalizedPhone || existingProfile.primaryPhone,
          organizationName: data.organizationName || existingProfile.organizationName,
          leadStatus: existingProfile.leadStatus === null ? null : data.status,
          leadScore: data.score ?? existingProfile.leadScore,
          source: data.source || existingProfile.source,
          assignedToUserId: assignedOwnerId ?? existingProfile.assignedToUserId,
          notes: [existingProfile.notes, combinedNotes].filter(Boolean).join("\n\n") || existingProfile.notes,
          tags: data.tags.length > 0 ? data.tags.join(", ") : existingProfile.tags,
          updatedAt: new Date(),
        },
      });

      await prisma.communicationLog.create({
        data: {
          customerProfileId: updatedLead.id,
          companyId: company.id,
          channel: "Webhook",
          type: "COMMENT",
          subject: "Lead updated from website form",
          notes: `Lead data was updated through the public lead webhook.${data.website ? ` Source website: ${data.website}.` : ""}`,
          date: new Date(),
        },
      });

      logger.info("Public lead webhook updated existing prospect", {
        companyId: company.id,
        customerProfileId: updatedLead.id,
        email: normalizedEmail,
      });

      return NextResponse.json(
        {
          ok: true,
          action: "updated",
          leadId: updatedLead.id,
          message: "Lead updated successfully",
        },
        { status: 200 },
      );
    }

    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        customerProfile: {
          select: { id: true, companyId: true },
        },
      },
    });

    if (user?.customerProfile && user.customerProfile.companyId !== company.id) {
      throw new ConflictError(
        "This email already belongs to a profile in another company and cannot be reused automatically.",
      );
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: data.name,
          password: `TEMP_PASSWORD_${Date.now()}`,
          role: "CUSTOMER",
          companyId: company.id,
          isActive: true,
        },
        include: {
          customerProfile: {
            select: { id: true, companyId: true },
          },
        },
      });
    }

    const lead = await prisma.customerProfile.create({
      data: {
        userId: user.id,
        companyId: company.id,
        customerType: "INDIVIDUAL",
        name: data.name,
        primaryEmail: normalizedEmail,
        primaryPhone: normalizedPhone,
        organizationName: data.organizationName || undefined,
        leadStatus: data.status,
        leadScore: data.score,
        source: data.source,
        assignedToUserId: assignedOwnerId || undefined,
        notes: combinedNotes || undefined,
        tags: data.tags.length > 0 ? data.tags.join(", ") : undefined,
      },
    });

    await prisma.communicationLog.create({
      data: {
        customerProfileId: lead.id,
        companyId: company.id,
        channel: "Webhook",
        type: "COMMENT",
        subject: "Lead captured from website form",
        notes: `Lead was created through the public lead webhook.${data.website ? ` Source website: ${data.website}.` : ""}`,
        date: new Date(),
      },
    });

    logger.info("Public lead webhook created new prospect", {
      companyId: company.id,
      customerProfileId: lead.id,
      email: normalizedEmail,
    });

    return NextResponse.json(
      {
        ok: true,
        action: "created",
        leadId: lead.id,
        message: "Lead captured successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error, req.nextUrl.pathname);
  }
}
