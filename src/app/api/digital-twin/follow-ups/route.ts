import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { authorizedRoute } from "@/lib/middleware-auth";
import { handleApiError, ValidationError } from "@/lib/error-handler";
import { prisma } from "@/lib/prisma";

const CreateSchema = z.object({
  employeeId: z.string().min(1),
  questionCategory: z.string().min(1),
  questionText: z.string().min(4),
  actionPlan: z.string().min(4),
  dueDate: z.string().optional().nullable(),
  signalSnapshot: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const GET = authorizedRoute(
  ["SUPER_ADMIN", "ADMIN", "MANAGER", "HR_MANAGER", "TEAM_LEADER", "EXECUTIVE"],
  async (req: NextRequest, user) => {
    try {
      if (!user.companyId) {
        return NextResponse.json({ error: "Company context is required" }, { status: 400 });
      }

      const { searchParams } = new URL(req.url);
      const status = searchParams.get("status");
      const employeeId = searchParams.get("employeeId");
      const departmentId = searchParams.get("departmentId");
      const limit = Math.max(10, Math.min(200, Number(searchParams.get("limit") || 80)));

      const where: any = {
        companyId: user.companyId,
      };
      if (status) where.status = status;
      if (employeeId) where.employeeId = employeeId;
      if (departmentId) where.departmentId = departmentId;

      const rows = await prisma.digitalTwinFollowUp.findMany({
        where,
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: limit,
      });

      const employeeIds = Array.from(new Set(rows.map((row) => row.employeeId)));
      const managerIds = Array.from(new Set(rows.map((row) => row.managerId)));
      const departmentIds = Array.from(
        new Set(rows.map((row) => row.departmentId).filter((id): id is string => !!id)),
      );

      const [employees, managers, departments] = await Promise.all([
        prisma.employeeProfile.findMany({
          where: { id: { in: employeeIds } },
          select: {
            id: true,
            employeeId: true,
            user: { select: { id: true, name: true, email: true } },
          },
        }),
        prisma.user.findMany({
          where: { id: { in: managerIds } },
          select: { id: true, name: true, email: true },
        }),
        prisma.department.findMany({
          where: { id: { in: departmentIds } },
          select: { id: true, name: true },
        }),
      ]);

      const employeeMap = new Map(employees.map((row) => [row.id, row]));
      const managerMap = new Map(managers.map((row) => [row.id, row]));
      const departmentMap = new Map(departments.map((row) => [row.id, row]));

      return NextResponse.json({
        items: rows.map((row) => ({
          ...row,
          employee:
            employeeMap.get(row.employeeId)
              ? {
                  id: employeeMap.get(row.employeeId)!.id,
                  employeeId: employeeMap.get(row.employeeId)!.employeeId,
                  name:
                    employeeMap.get(row.employeeId)!.user?.name ||
                    employeeMap.get(row.employeeId)!.user?.email ||
                    "Unknown",
                }
              : null,
          manager:
            managerMap.get(row.managerId)
              ? {
                  id: managerMap.get(row.managerId)!.id,
                  name: managerMap.get(row.managerId)!.name || managerMap.get(row.managerId)!.email,
                }
              : null,
          department: row.departmentId ? departmentMap.get(row.departmentId) || null : null,
        })),
      });
    } catch (error) {
      return handleApiError(error, "/api/digital-twin/follow-ups");
    }
  },
);

export const POST = authorizedRoute(
  ["SUPER_ADMIN", "ADMIN", "MANAGER", "HR_MANAGER", "TEAM_LEADER"],
  async (req: NextRequest, user) => {
    try {
      if (!user.companyId) {
        return NextResponse.json({ error: "Company context is required" }, { status: 400 });
      }

      const parsed = CreateSchema.safeParse(await req.json());
      if (!parsed.success) {
        throw new ValidationError("Invalid follow-up payload", parsed.error.flatten());
      }

      const payload = parsed.data;
      const employee = await prisma.employeeProfile.findFirst({
        where: { id: payload.employeeId, user: { companyId: user.companyId } },
        select: {
          id: true,
          user: { select: { departmentId: true } },
        },
      });

      if (!employee) {
        return NextResponse.json({ error: "Employee not found in your company" }, { status: 404 });
      }

      const created = await prisma.digitalTwinFollowUp.create({
        data: {
          companyId: user.companyId,
          departmentId: employee.user?.departmentId || null,
          employeeId: payload.employeeId,
          managerId: user.id,
          questionCategory: payload.questionCategory.toUpperCase(),
          questionText: payload.questionText.trim(),
          actionPlan: payload.actionPlan.trim(),
          dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
          signalSnapshot: (payload.signalSnapshot || undefined) as Prisma.InputJsonValue | undefined,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "DIGITAL_TWIN_FOLLOW_UP_CREATE",
          entity: "digital_twin_follow_up",
          entityId: created.id,
          changes: {
            employeeId: created.employeeId,
            questionCategory: created.questionCategory,
            dueDate: created.dueDate?.toISOString() || null,
          },
        },
      });

      return NextResponse.json(created, { status: 201 });
    } catch (error) {
      return handleApiError(error, "/api/digital-twin/follow-ups");
    }
  },
);
