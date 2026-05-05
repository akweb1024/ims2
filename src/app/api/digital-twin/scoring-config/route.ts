import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { authorizedRoute } from "@/lib/middleware-auth";
import { handleApiError, ValidationError } from "@/lib/error-handler";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_SCORING_WEIGHTS,
  sanitizeScoringWeights,
  getDigitalTwinScoringConfig,
} from "@/lib/digital-twin/scoring-config";

const WeightSchema = z.object({
  attendance: z.number().min(0).max(5),
  workReport: z.number().min(0).max(5),
  kpi: z.number().min(0).max(5),
  kra: z.number().min(0).max(5),
  discipline: z.number().min(0).max(5),
  projectLoad: z.number().min(0).max(5),
  thinkTank: z.number().min(0).max(5),
});

const UpsertSchema = z.object({
  departmentId: z.string().optional().nullable(),
  weights: WeightSchema,
  riskThresholdHigh: z.number().int().min(40).max(95),
  riskThresholdMedium: z.number().int().min(10).max(90),
  isActive: z.boolean().optional(),
});

export const GET = authorizedRoute(
  ["SUPER_ADMIN", "ADMIN", "MANAGER", "HR_MANAGER", "TEAM_LEADER"],
  async (_req: NextRequest, user) => {
    try {
      if (!user.companyId) {
        return NextResponse.json({ error: "Company context is required" }, { status: 400 });
      }

      const [config, departments] = await Promise.all([
        getDigitalTwinScoringConfig(user.companyId),
        prisma.department.findMany({
          where: { companyId: user.companyId, isActive: true },
          select: { id: true, name: true, code: true },
          orderBy: { name: "asc" },
        }),
      ]);

      return NextResponse.json({
        defaults: DEFAULT_SCORING_WEIGHTS,
        defaultConfig: config.defaultConfig,
        departmentConfigs: Array.from(config.byDepartment.values()),
        departments,
      });
    } catch (error) {
      return handleApiError(error, "/api/digital-twin/scoring-config");
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

      const parsed = UpsertSchema.safeParse(await req.json());
      if (!parsed.success) {
        throw new ValidationError("Invalid scoring configuration payload", parsed.error.flatten());
      }

      const data = parsed.data;
      if (data.riskThresholdMedium >= data.riskThresholdHigh) {
        throw new ValidationError("Medium threshold must be lower than high threshold");
      }

      let departmentName: string | null = null;
      if (data.departmentId) {
        const department = await prisma.department.findFirst({
          where: { id: data.departmentId, companyId: user.companyId },
          select: { id: true, name: true },
        });
        if (!department) {
          return NextResponse.json({ error: "Department not found in your company" }, { status: 404 });
        }
        departmentName = department.name;
      }

      const existing = await prisma.digitalTwinDepartmentConfig.findFirst({
        where: {
          companyId: user.companyId,
          departmentId: data.departmentId || null,
        },
        select: { id: true },
      });

      const saved = existing
        ? await prisma.digitalTwinDepartmentConfig.update({
            where: { id: existing.id },
            data: {
              departmentId: data.departmentId || null,
              departmentName,
              scoringWeights: sanitizeScoringWeights(data.weights) as unknown as Prisma.InputJsonValue,
              riskThresholdHigh: data.riskThresholdHigh,
              riskThresholdMedium: data.riskThresholdMedium,
              isActive: data.isActive ?? true,
              updatedById: user.id,
            },
          })
        : await prisma.digitalTwinDepartmentConfig.create({
            data: {
              companyId: user.companyId,
              departmentId: data.departmentId || null,
              departmentName,
              scoringWeights: sanitizeScoringWeights(data.weights) as unknown as Prisma.InputJsonValue,
              riskThresholdHigh: data.riskThresholdHigh,
              riskThresholdMedium: data.riskThresholdMedium,
              isActive: data.isActive ?? true,
              updatedById: user.id,
            },
          });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "DIGITAL_TWIN_SCORING_CONFIG_UPSERT",
          entity: "digital_twin_department_config",
          entityId: saved.id,
          changes: {
            departmentId: data.departmentId || null,
            riskThresholdHigh: data.riskThresholdHigh,
            riskThresholdMedium: data.riskThresholdMedium,
            weights: sanitizeScoringWeights(data.weights),
          } as unknown as Prisma.InputJsonValue,
        },
      });

      return NextResponse.json({
        id: saved.id,
        companyId: saved.companyId,
        departmentId: saved.departmentId,
        departmentName: saved.departmentName,
        weights: sanitizeScoringWeights(saved.scoringWeights),
        riskThresholdHigh: saved.riskThresholdHigh,
        riskThresholdMedium: saved.riskThresholdMedium,
        isActive: saved.isActive,
        updatedAt: saved.updatedAt,
      });
    } catch (error) {
      return handleApiError(error, "/api/digital-twin/scoring-config");
    }
  },
);
