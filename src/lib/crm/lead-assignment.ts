import { prisma } from "@/lib/prisma";

const LEAD_ASSIGNMENT_CATEGORY = "CRM";
const LEAD_ASSIGNMENT_CURSOR_KEY = "lead_assignment_cursor";
const LEAD_ASSIGNMENT_LAST_AUTO_AT_KEY = "lead_assignment_last_auto_at";
const LEAD_ASSIGNMENT_LAST_AUTO_BY_KEY = "lead_assignment_last_auto_by";
const LEAD_ASSIGNMENT_AUDIT_ENTITY = "LeadAssignmentCursor";

export async function resolveLeadOwner(params: {
  companyId?: string | null;
  preferredUserId?: string | null;
  fallbackUserId?: string | null;
  changedByUserId?: string | null;
}) {
  const { companyId, preferredUserId, fallbackUserId, changedByUserId } = params;

  if (preferredUserId) return preferredUserId;
  if (!companyId) return fallbackUserId || null;

  return prisma.$transaction(async (tx) => {
    const candidates = await tx.user.findMany({
      where: {
        companyId,
        isActive: true,
        role: "EXECUTIVE",
      },
      select: {
        id: true,
        createdAt: true,
      },
      orderBy: [
        { createdAt: "asc" },
        { id: "asc" },
      ],
    });

    if (candidates.length === 0) {
      return fallbackUserId || null;
    }

    const cursor = await tx.appConfiguration.findUnique({
      where: {
        companyId_category_key: {
          companyId,
          category: LEAD_ASSIGNMENT_CATEGORY,
          key: LEAD_ASSIGNMENT_CURSOR_KEY,
        },
      },
    });

    const lastAssignedId = cursor?.value || null;
    const lastAssignedIndex = candidates.findIndex((candidate) => candidate.id === lastAssignedId);
    const nextIndex = lastAssignedIndex >= 0
      ? (lastAssignedIndex + 1) % candidates.length
      : 0;
    const nextOwnerId = candidates[nextIndex]?.id || fallbackUserId || null;

    if (!nextOwnerId) {
      return fallbackUserId || null;
    }

    await tx.appConfiguration.upsert({
      where: {
        companyId_category_key: {
          companyId,
          category: LEAD_ASSIGNMENT_CATEGORY,
          key: LEAD_ASSIGNMENT_CURSOR_KEY,
        },
      },
      update: {
        value: nextOwnerId,
        isActive: true,
        description: "Stores the last executive assigned by CRM lead round-robin.",
        createdBy: changedByUserId || undefined,
      },
      create: {
        companyId,
        category: LEAD_ASSIGNMENT_CATEGORY,
        key: LEAD_ASSIGNMENT_CURSOR_KEY,
        value: nextOwnerId,
        isActive: true,
        description: "Stores the last executive assigned by CRM lead round-robin.",
        createdBy: changedByUserId || undefined,
      },
    });

    await tx.appConfiguration.upsert({
      where: {
        companyId_category_key: {
          companyId,
          category: LEAD_ASSIGNMENT_CATEGORY,
          key: LEAD_ASSIGNMENT_LAST_AUTO_AT_KEY,
        },
      },
      update: {
        value: new Date().toISOString(),
        isActive: true,
        description: "Stores when the CRM lead round-robin last auto-rotated.",
      },
      create: {
        companyId,
        category: LEAD_ASSIGNMENT_CATEGORY,
        key: LEAD_ASSIGNMENT_LAST_AUTO_AT_KEY,
        value: new Date().toISOString(),
        isActive: true,
        description: "Stores when the CRM lead round-robin last auto-rotated.",
      },
    });

    await tx.appConfiguration.upsert({
      where: {
        companyId_category_key: {
          companyId,
          category: LEAD_ASSIGNMENT_CATEGORY,
          key: LEAD_ASSIGNMENT_LAST_AUTO_BY_KEY,
        },
      },
      update: {
        value: nextOwnerId,
        isActive: true,
        description: "Stores which executive received the last auto-rotated CRM lead.",
      },
      create: {
        companyId,
        category: LEAD_ASSIGNMENT_CATEGORY,
        key: LEAD_ASSIGNMENT_LAST_AUTO_BY_KEY,
        value: nextOwnerId,
        isActive: true,
        description: "Stores which executive received the last auto-rotated CRM lead.",
      },
    });

    await tx.auditLog.create({
      data: {
        userId: changedByUserId || null,
        action: "AUTO_ROTATE_LEAD_ASSIGNMENT",
        entity: LEAD_ASSIGNMENT_AUDIT_ENTITY,
        entityId: companyId,
        changes: {
          assignedExecutiveId: nextOwnerId,
          assignedBy: changedByUserId || "system",
        },
      },
    });

    return nextOwnerId;
  });
}
