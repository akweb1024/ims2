import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizedRoute } from "@/lib/middleware-auth";
import { handleApiError, ValidationError } from "@/lib/error-handler";
import { prisma } from "@/lib/prisma";

const UpdateSchema = z.object({
  actionPlan: z.string().min(4).optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "DISMISSED"]).optional(),
  outcome: z.string().optional().nullable(),
  outcomeRating: z.number().int().min(1).max(5).optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

export const PATCH = authorizedRoute(
  ["SUPER_ADMIN", "ADMIN", "MANAGER", "HR_MANAGER", "TEAM_LEADER"],
  async (
    req: NextRequest,
    user,
    context: { params: Promise<{ id: string }> },
  ) => {
    try {
      if (!user.companyId) {
        return NextResponse.json({ error: "Company context is required" }, { status: 400 });
      }

      const { id } = await context.params;
      const parsed = UpdateSchema.safeParse(await req.json());
      if (!parsed.success) {
        throw new ValidationError("Invalid follow-up update payload", parsed.error.flatten());
      }

      const existing = await prisma.digitalTwinFollowUp.findFirst({
        where: { id, companyId: user.companyId },
        select: { id: true },
      });
      if (!existing) {
        return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
      }

      const payload = parsed.data;
      const status = payload.status;
      const resolvedAt = status === "RESOLVED" ? new Date() : undefined;

      const updated = await prisma.digitalTwinFollowUp.update({
        where: { id },
        data: {
          actionPlan: payload.actionPlan?.trim(),
          status,
          outcome: payload.outcome?.trim() || null,
          outcomeRating: payload.outcomeRating ?? null,
          dueDate: payload.dueDate !== undefined ? (payload.dueDate ? new Date(payload.dueDate) : null) : undefined,
          resolvedAt: status ? (resolvedAt || null) : undefined,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "DIGITAL_TWIN_FOLLOW_UP_UPDATE",
          entity: "digital_twin_follow_up",
          entityId: updated.id,
          changes: {
            status: updated.status,
            outcomeRating: updated.outcomeRating,
          },
        },
      });

      return NextResponse.json(updated);
    } catch (error) {
      return handleApiError(error, "/api/digital-twin/follow-ups/[id]");
    }
  },
);
