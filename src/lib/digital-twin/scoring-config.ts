import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface DepartmentScoringWeights {
  attendance: number;
  workReport: number;
  kpi: number;
  kra: number;
  discipline: number;
  projectLoad: number;
  thinkTank: number;
}

export interface DepartmentScoringConfig {
  companyId: string;
  departmentId: string | null;
  departmentName: string | null;
  weights: DepartmentScoringWeights;
  riskThresholdHigh: number;
  riskThresholdMedium: number;
  isActive: boolean;
}

export const DEFAULT_SCORING_WEIGHTS: DepartmentScoringWeights = {
  attendance: 1,
  workReport: 1,
  kpi: 1,
  kra: 1,
  discipline: 1,
  projectLoad: 1,
  thinkTank: 1,
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function sanitizeScoringWeights(input: unknown): DepartmentScoringWeights {
  if (!input || typeof input !== "object") return DEFAULT_SCORING_WEIGHTS;
  const row = input as Record<string, unknown>;
  return {
    attendance: clamp(Number(row.attendance ?? DEFAULT_SCORING_WEIGHTS.attendance), 0, 5),
    workReport: clamp(Number(row.workReport ?? DEFAULT_SCORING_WEIGHTS.workReport), 0, 5),
    kpi: clamp(Number(row.kpi ?? DEFAULT_SCORING_WEIGHTS.kpi), 0, 5),
    kra: clamp(Number(row.kra ?? DEFAULT_SCORING_WEIGHTS.kra), 0, 5),
    discipline: clamp(Number(row.discipline ?? DEFAULT_SCORING_WEIGHTS.discipline), 0, 5),
    projectLoad: clamp(Number(row.projectLoad ?? DEFAULT_SCORING_WEIGHTS.projectLoad), 0, 5),
    thinkTank: clamp(Number(row.thinkTank ?? DEFAULT_SCORING_WEIGHTS.thinkTank), 0, 5),
  };
}

export async function getDigitalTwinScoringConfig(companyId: string) {
  let records: Array<{
    companyId: string;
    departmentId: string | null;
    departmentName: string | null;
    scoringWeights: unknown;
    riskThresholdHigh: number;
    riskThresholdMedium: number;
    isActive: boolean;
    updatedAt: Date;
  }> = [];

  try {
    records = await prisma.digitalTwinDepartmentConfig.findMany({
      where: {
        companyId,
        isActive: true,
      },
      orderBy: { updatedAt: "desc" },
    });
  } catch (error) {
    // Soft-fallback when schema migration is not yet applied in target DB.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      return {
        defaultConfig: {
          companyId,
          departmentId: null,
          departmentName: null,
          weights: DEFAULT_SCORING_WEIGHTS,
          riskThresholdHigh: 65,
          riskThresholdMedium: 35,
          isActive: true,
        },
        byDepartment: new Map<string, DepartmentScoringConfig>(),
        items: [] as DepartmentScoringConfig[],
      };
    }
    throw error;
  }

  const mapped: DepartmentScoringConfig[] = records.map((record) => {
    const high = clamp(Number(record.riskThresholdHigh || 65), 40, 95);
    const medium = clamp(Number(record.riskThresholdMedium || 35), 10, high - 5);
    return {
      companyId: record.companyId,
      departmentId: record.departmentId || null,
      departmentName: record.departmentName || null,
      weights: sanitizeScoringWeights(record.scoringWeights),
      riskThresholdHigh: high,
      riskThresholdMedium: medium,
      isActive: record.isActive,
    };
  });

  const defaultConfig =
    mapped.find((item) => item.departmentId === null) || {
      companyId,
      departmentId: null,
      departmentName: null,
      weights: DEFAULT_SCORING_WEIGHTS,
      riskThresholdHigh: 65,
      riskThresholdMedium: 35,
      isActive: true,
    };

  const byDepartment = new Map(
    mapped
      .filter((item) => item.departmentId)
      .map((item) => [item.departmentId as string, item]),
  );

  return { defaultConfig, byDepartment, items: mapped };
}
