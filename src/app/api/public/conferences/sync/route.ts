import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleApiError, AuthorizationError, NotFoundError } from "@/lib/error-handler";
import { logger } from "@/lib/logger";

const registrationSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  organization: z.string().optional().nullable(),
  amountPaid: z.number().optional().default(0),
  status: z.string().optional().default("REGISTERED"),
  ticketTypeName: z.string().optional().default("General"),
  ticketPrice: z.number().optional().default(0),
  dietaryRequirements: z.string().optional().nullable(),
  tshirtSize: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const conferenceSyncSchema = z.object({
  companyId: z.string().uuid("Valid companyId is required"),
  conference: z.object({
    title: z.string().min(3),
    description: z.string().min(10),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    venue: z.string().optional().nullable(),
    organizer: z.string().optional().nullable(),
    website: z.string().optional().nullable(),
    logoUrl: z.string().optional().nullable(),
    bannerUrl: z.string().optional().nullable(),
    primaryColor: z.string().optional().nullable(),
    mode: z.enum(["IN_PERSON", "VIRTUAL", "HYBRID"]).optional().default("IN_PERSON"),
    maxAttendees: z.number().int().optional().nullable(),
    cfpStartDate: z.string().optional().nullable(),
    cfpEndDate: z.string().optional().nullable(),
    reviewDeadline: z.string().optional().nullable(),
    timezone: z.string().optional().default("UTC"),
    registrationFee: z.number().optional().default(0),
    currency: z.string().optional().default("INR"),
    status: z.string().optional().default("DRAFT"),
  }),
  registrations: z.array(registrationSchema).optional().default([]),
  createFollowupLeads: z.boolean().optional().default(true),
  sourceWebsite: z.string().optional().nullable(),
});

function getWebhookSecret(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return req.headers.get("x-webhook-secret");
}

async function ensureLeadForRegistrant(args: {
  companyId: string;
  conferenceTitle: string;
  sourceWebsite?: string | null;
  registration: z.infer<typeof registrationSchema>;
}) {
  const normalizedEmail = args.registration.email.trim().toLowerCase();
  const normalizedPhone = args.registration.phone?.trim() || "";

  const existingProfile = await prisma.customerProfile.findFirst({
    where: {
      companyId: args.companyId,
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

  const tagParts = ["conference-sync", args.conferenceTitle].filter(Boolean);
  const notes = [
    `Conference: ${args.conferenceTitle}`,
    args.registration.organization ? `Organization: ${args.registration.organization}` : null,
    args.registration.phone ? `Phone: ${args.registration.phone}` : null,
    args.sourceWebsite ? `Source website: ${args.sourceWebsite}` : null,
    args.registration.notes ? `Notes: ${args.registration.notes}` : null,
  ].filter(Boolean).join("\n");

  if (existingProfile) {
    const updated = await prisma.customerProfile.update({
      where: { id: existingProfile.id },
      data: {
        name: args.registration.name,
        primaryPhone: normalizedPhone || existingProfile.primaryPhone,
        organizationName: args.registration.organization || existingProfile.organizationName,
        source: existingProfile.source || "CONFERENCE_SYNC",
        leadStatus: existingProfile.leadStatus ?? "NEW",
        notes: [existingProfile.notes, notes].filter(Boolean).join("\n\n") || existingProfile.notes,
        tags: [existingProfile.tags, ...tagParts].filter(Boolean).join(", "),
      },
    });

    await prisma.communicationLog.create({
      data: {
        customerProfileId: updated.id,
        companyId: args.companyId,
        channel: "Conference Sync",
        type: "COMMENT",
        subject: `Conference registration synced: ${args.conferenceTitle}`,
        notes: `Registrant record was updated from the conference sync webhook.`,
        date: new Date(),
      },
    });

    return updated.id;
  }

  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      customerProfile: {
        select: { id: true, companyId: true },
      },
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: args.registration.name,
        password: `TEMP_PASSWORD_${Date.now()}`,
        role: "CUSTOMER",
        companyId: args.companyId,
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
      companyId: args.companyId,
      customerType: "INDIVIDUAL",
      name: args.registration.name,
      primaryEmail: normalizedEmail,
      primaryPhone: normalizedPhone,
      organizationName: args.registration.organization || undefined,
      leadStatus: "NEW",
      source: "CONFERENCE_SYNC",
      notes: notes || undefined,
      tags: tagParts.join(", "),
    },
  });

  await prisma.communicationLog.create({
    data: {
      customerProfileId: lead.id,
      companyId: args.companyId,
      channel: "Conference Sync",
      type: "COMMENT",
      subject: `Conference registration synced: ${args.conferenceTitle}`,
      notes: `Registrant lead was created from the conference sync webhook.`,
      date: new Date(),
    },
  });

  return lead.id;
}

export async function GET() {
  return NextResponse.json({
    name: "Conference Sync Webhook",
    method: "POST",
    path: "/api/public/conferences/sync",
    auth: "Authorization: Bearer <CONFERENCE_SYNC_WEBHOOK_SECRET> or x-webhook-secret header",
    requiredFields: ["companyId", "conference.title", "conference.description", "conference.startDate", "conference.endDate"],
    optionalFields: [
      "conference.venue",
      "conference.organizer",
      "conference.website",
      "conference.mode",
      "conference.status",
      "registrations[]",
      "createFollowupLeads",
      "sourceWebsite",
    ],
  });
}

export async function POST(req: NextRequest) {
  try {
    const expectedSecret = process.env.CONFERENCE_SYNC_WEBHOOK_SECRET;
    const receivedSecret = getWebhookSecret(req);

    if (!expectedSecret) {
      throw new AuthorizationError("Conference sync webhook is not configured");
    }

    if (receivedSecret !== expectedSecret) {
      logger.security("Invalid conference sync webhook secret", {
        path: req.nextUrl.pathname,
        ip:
          req.headers.get("x-forwarded-for") ||
          req.headers.get("x-real-ip") ||
          "unknown",
      });
      throw new AuthorizationError("Invalid webhook secret");
    }

    const body = await req.json();
    const data = conferenceSyncSchema.parse(body);

    const company = await prisma.company.findUnique({
      where: { id: data.companyId },
      select: { id: true, name: true },
    });

    if (!company) {
      throw new NotFoundError("Company");
    }

    const startDate = new Date(data.conference.startDate);
    const endDate = new Date(data.conference.endDate);

    let conference = await prisma.conference.findFirst({
      where: {
        companyId: company.id,
        title: {
          equals: data.conference.title,
          mode: "insensitive",
        },
        startDate,
      },
    });

    if (conference) {
      conference = await prisma.conference.update({
        where: { id: conference.id },
        data: {
          description: data.conference.description,
          endDate,
          venue: data.conference.venue || undefined,
          organizer: data.conference.organizer || undefined,
          website: data.conference.website || undefined,
          logoUrl: data.conference.logoUrl || undefined,
          bannerUrl: data.conference.bannerUrl || undefined,
          primaryColor: data.conference.primaryColor || conference.primaryColor,
          mode: data.conference.mode,
          maxAttendees: data.conference.maxAttendees ?? undefined,
          cfpStartDate: data.conference.cfpStartDate ? new Date(data.conference.cfpStartDate) : null,
          cfpEndDate: data.conference.cfpEndDate ? new Date(data.conference.cfpEndDate) : null,
          reviewDeadline: data.conference.reviewDeadline ? new Date(data.conference.reviewDeadline) : null,
          timezone: data.conference.timezone,
          registrationFee: data.conference.registrationFee,
          currency: data.conference.currency,
          status: data.conference.status,
          isActive: true,
        },
      });
    } else {
      conference = await prisma.conference.create({
        data: {
          companyId: company.id,
          title: data.conference.title,
          description: data.conference.description,
          startDate,
          endDate,
          venue: data.conference.venue || undefined,
          organizer: data.conference.organizer || undefined,
          website: data.conference.website || undefined,
          logoUrl: data.conference.logoUrl || undefined,
          bannerUrl: data.conference.bannerUrl || undefined,
          primaryColor: data.conference.primaryColor || "#3B82F6",
          mode: data.conference.mode,
          maxAttendees: data.conference.maxAttendees ?? undefined,
          cfpStartDate: data.conference.cfpStartDate ? new Date(data.conference.cfpStartDate) : null,
          cfpEndDate: data.conference.cfpEndDate ? new Date(data.conference.cfpEndDate) : null,
          reviewDeadline: data.conference.reviewDeadline ? new Date(data.conference.reviewDeadline) : null,
          timezone: data.conference.timezone,
          registrationFee: data.conference.registrationFee,
          currency: data.conference.currency,
          status: data.conference.status,
          isActive: true,
        },
      });
    }

    let importedRegistrations = 0;
    let createdLeads = 0;

    for (const registration of data.registrations) {
      let ticketType = await prisma.conferenceTicketType.findFirst({
        where: {
          conferenceId: conference.id,
          name: {
            equals: registration.ticketTypeName,
            mode: "insensitive",
          },
        },
      });

      if (!ticketType) {
        ticketType = await prisma.conferenceTicketType.create({
          data: {
            conferenceId: conference.id,
            name: registration.ticketTypeName,
            price: registration.ticketPrice,
            currency: data.conference.currency,
          },
        });
      }

      const existingRegistration = await prisma.conferenceRegistration.findFirst({
        where: {
          conferenceId: conference.id,
          email: {
            equals: registration.email.trim().toLowerCase(),
            mode: "insensitive",
          },
          ticketTypeId: ticketType.id,
        },
      });

      if (existingRegistration) {
        await prisma.conferenceRegistration.update({
          where: { id: existingRegistration.id },
          data: {
            name: registration.name,
            organization: registration.organization || undefined,
            amountPaid: registration.amountPaid,
            status: registration.status,
            phone: registration.phone || undefined,
            dietaryRequirements: registration.dietaryRequirements || undefined,
            tshirtSize: registration.tshirtSize || undefined,
            notes: registration.notes || undefined,
          },
        });
      } else {
        await prisma.conferenceRegistration.create({
          data: {
            conferenceId: conference.id,
            name: registration.name,
            email: registration.email.trim().toLowerCase(),
            organization: registration.organization || undefined,
            ticketTypeId: ticketType.id,
            amountPaid: registration.amountPaid,
            status: registration.status,
            phone: registration.phone || undefined,
            dietaryRequirements: registration.dietaryRequirements || undefined,
            tshirtSize: registration.tshirtSize || undefined,
            notes: registration.notes || undefined,
          },
        });

        await prisma.conferenceTicketType.update({
          where: { id: ticketType.id },
          data: { soldCount: { increment: 1 } },
        });
      }

      importedRegistrations += 1;

      if (data.createFollowupLeads) {
        await ensureLeadForRegistrant({
          companyId: company.id,
          conferenceTitle: conference.title,
          sourceWebsite: data.sourceWebsite,
          registration,
        });
        createdLeads += 1;
      }
    }

    logger.info("Conference sync webhook processed", {
      companyId: company.id,
      conferenceId: conference.id,
      registrations: importedRegistrations,
      leadsCreated: createdLeads,
    });

    return NextResponse.json({
      ok: true,
      conferenceId: conference.id,
      registrationsProcessed: importedRegistrations,
      followupLeadsProcessed: createdLeads,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
