import { NextRequest, NextResponse } from "next/server";
import { authorizedRoute } from "@/lib/middleware-auth";
import { prisma } from "@/lib/prisma";
import { handleApiError, ValidationError } from "@/lib/error-handler";
import { z } from "zod";

const LEAD_ASSIGNMENT_CATEGORY = "CRM";
const LEAD_ASSIGNMENT_CURSOR_KEY = "lead_assignment_cursor";
const LEAD_ASSIGNMENT_LAST_AUTO_AT_KEY = "lead_assignment_last_auto_at";
const LEAD_ASSIGNMENT_LAST_AUTO_BY_KEY = "lead_assignment_last_auto_by";
const LEAD_ASSIGNMENT_AUDIT_ENTITY = "LeadAssignmentCursor";
const updateLeadAssignmentSchema = z.object({
  nextExecutiveUserId: z.string().uuid("Valid executive user ID is required"),
});

export const GET = authorizedRoute(
  ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  async (_req: NextRequest, user) => {
    try {
      const companyId = user.companyId;
      if (!companyId) {
        throw new ValidationError("Company context is required");
      }

      const [configs, executives, logs] = await Promise.all([
        prisma.appConfiguration.findMany({
          where: {
            companyId,
            category: LEAD_ASSIGNMENT_CATEGORY,
            key: {
              in: [
                LEAD_ASSIGNMENT_CURSOR_KEY,
                LEAD_ASSIGNMENT_LAST_AUTO_AT_KEY,
                LEAD_ASSIGNMENT_LAST_AUTO_BY_KEY,
              ],
            },
          },
          select: {
            key: true,
            value: true,
            updatedAt: true,
            createdBy: true,
          },
        }),
        prisma.user.findMany({
          where: {
            companyId,
            isActive: true,
            role: "EXECUTIVE",
          },
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
          orderBy: [
            { createdAt: "asc" },
            { id: "asc" },
          ],
        }),
        prisma.auditLog.findMany({
          where: {
            entity: LEAD_ASSIGNMENT_AUDIT_ENTITY,
            entityId: companyId,
          },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        }),
      ]);

      const configMap = Object.fromEntries(configs.map((config) => [config.key, config]));
      const cursor = configMap[LEAD_ASSIGNMENT_CURSOR_KEY] || null;
      const lastAutoAtConfig = configMap[LEAD_ASSIGNMENT_LAST_AUTO_AT_KEY] || null;
      const lastAutoByConfig = configMap[LEAD_ASSIGNMENT_LAST_AUTO_BY_KEY] || null;

      const lastChangedBy = cursor?.createdBy
        ? await prisma.user.findUnique({
            where: { id: cursor.createdBy },
            select: { id: true, name: true, email: true },
          })
        : null;

      const lastAutoBy = lastAutoByConfig?.value
        ? await prisma.user.findUnique({
            where: { id: lastAutoByConfig.value },
            select: { id: true, name: true, email: true },
          })
        : null;

      const currentExecutive = executives.find((exec) => exec.id === cursor?.value) || null;
      const nextExecutive = executives.length === 0
        ? null
        : currentExecutive
          ? executives[(executives.findIndex((exec) => exec.id === currentExecutive.id) + 1) % executives.length]
          : executives[0];

      const executiveMap = new Map(executives.map((exec) => [exec.id, exec]));

      return NextResponse.json({
        currentCursorUserId: cursor?.value || null,
        currentExecutive,
        nextExecutive,
        executives,
        lastChangedAt: cursor?.updatedAt || null,
        lastChangedBy,
        lastAutoRotationAt: lastAutoAtConfig?.value || null,
        lastAutoRotationBy: lastAutoBy,
        events: logs.map((log) => ({
          id: log.id,
          action: log.action,
          createdAt: log.createdAt,
          user: log.user,
          changes: log.changes,
          targetExecutive: (() => {
            const changes = log.changes as Record<string, any> | null;
            const executiveId =
              changes?.nextExecutiveUserId ||
              changes?.assignedExecutiveId ||
              null;
            return executiveId ? executiveMap.get(executiveId) || null : null;
          })(),
        })),
      });
    } catch (error) {
      return handleApiError(error, _req.nextUrl.pathname);
    }
  },
);

export const DELETE = authorizedRoute(
  ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  async (req: NextRequest, user) => {
    try {
      if (!user.companyId) {
        throw new ValidationError("Company context is required");
      }

      await prisma.appConfiguration.deleteMany({
        where: {
          companyId: user.companyId,
          category: LEAD_ASSIGNMENT_CATEGORY,
          key: LEAD_ASSIGNMENT_CURSOR_KEY,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "RESET_LEAD_ASSIGNMENT_CURSOR",
          entity: LEAD_ASSIGNMENT_AUDIT_ENTITY,
          entityId: user.companyId,
          changes: {
            message: "Lead assignment cursor was reset",
          },
        },
      });

      return NextResponse.json({
        ok: true,
        message: "Lead assignment cursor reset successfully",
      });
    } catch (error) {
      return handleApiError(error, req.nextUrl.pathname);
    }
  },
);

export const PATCH = authorizedRoute(
  ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  async (req: NextRequest, user) => {
    try {
      if (!user.companyId) {
        throw new ValidationError("Company context is required");
      }

      const body = await req.json();
      const { nextExecutiveUserId } = updateLeadAssignmentSchema.parse(body);

      const executives = await prisma.user.findMany({
        where: {
          companyId: user.companyId,
          isActive: true,
          role: "EXECUTIVE",
        },
        select: {
          id: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });

      if (executives.length === 0) {
        throw new ValidationError("No active executives are available");
      }

      const requestedIndex = executives.findIndex((exec) => exec.id === nextExecutiveUserId);
      if (requestedIndex === -1) {
        throw new ValidationError("Selected executive is not eligible for lead assignment");
      }

      const previousIndex =
        requestedIndex === 0 ? executives.length - 1 : requestedIndex - 1;
      const cursorUserId = executives[previousIndex].id;

      await prisma.appConfiguration.upsert({
        where: {
          companyId_category_key: {
            companyId: user.companyId,
            category: LEAD_ASSIGNMENT_CATEGORY,
            key: LEAD_ASSIGNMENT_CURSOR_KEY,
          },
        },
        update: {
          value: cursorUserId,
          isActive: true,
          description: "Stores the last executive assigned by CRM lead round-robin.",
          createdBy: user.id,
        },
        create: {
          companyId: user.companyId,
          category: LEAD_ASSIGNMENT_CATEGORY,
          key: LEAD_ASSIGNMENT_CURSOR_KEY,
          value: cursorUserId,
          isActive: true,
          description: "Stores the last executive assigned by CRM lead round-robin.",
          createdBy: user.id,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "SET_NEXT_LEAD_EXECUTIVE",
          entity: LEAD_ASSIGNMENT_AUDIT_ENTITY,
          entityId: user.companyId,
          changes: {
            nextExecutiveUserId,
            cursorUserId,
          },
        },
      });

      return NextResponse.json({
        ok: true,
        message: "Next executive updated successfully",
        nextExecutiveUserId,
      });
    } catch (error) {
      return handleApiError(error, req.nextUrl.pathname);
    }
  },
);
