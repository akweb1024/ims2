import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizedRoute } from "@/lib/middleware-auth";
import {
  handleApiError,
  AuthorizationError,
  ValidationError,
} from "@/lib/error-handler";
import { createNotification } from "@/lib/system-notifications";
import { logger } from "@/lib/logger";
import { itProjectSchema } from "@/lib/validation/schemas";
import { getDownlineUserIds } from "@/lib/hierarchy";

export const dynamic = "force-dynamic";

// Roles allowed to manage IT projects
const IT_MANAGER_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "IT_MANAGER",
  "IT_ADMIN",
  "IT_SUPPORT",
  "MANAGER",
  "TEAM_LEADER",
  "HR_MANAGER",
  "FINANCE_ADMIN"
];
const ALL_ACCESS_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "IT_MANAGER",
  "IT_ADMIN",
  "MANAGER",
];

/**
 * Project roster roles, most senior first. A person attached in several ways (say, the
 * project manager who also owns two tasks) is listed once under their highest role.
 */
const TEAM_ROLE_RANK = {
  Manager: 0,
  Lead: 1,
  Contributor: 2,
  Member: 3,
} as const;
type TeamRole = keyof typeof TEAM_ROLE_RANK;

interface Personnel {
  id: string;
  name: string | null;
  email: string | null;
}
interface TeamMember extends Personnel {
  role: TeamRole;
  openTasks: number;
  doneTasks: number;
}

// GET /api/it/projects - List all projects (filtered by role)
export const GET = authorizedRoute(
  [
    "SUPER_ADMIN",
    "ADMIN",
    "IT_MANAGER",
    "IT_ADMIN",
    "IT_SUPPORT",
    "MANAGER",
    "EXECUTIVE",
  ],
  async (req: NextRequest, user) => {
    try {
      const companyId = user.companyId;
      if (!companyId)
        throw new ValidationError(
          "Company context is required for this operation",
        );

      const { searchParams } = new URL(req.url);
      const status     = searchParams.get("status");
      const type       = searchParams.get("type");
      const category   = searchParams.get("category");
      const managerId  = searchParams.get("managerId");
      const isRevenueBased = searchParams.get("isRevenueBased");

      // Build where clause
      const where: any = { companyId };

      // Restricted view for non-admin/non-IT manager roles
      if (!ALL_ACCESS_ROLES.includes(user.role)) {
        // Managers/Team Leaders see projects their entire downline is involved in
        if (["MANAGER", "TEAM_LEADER"].includes(user.role)) {
          const downlineIds = await getDownlineUserIds(user.id, null); // cross-company
          const teamIds = [...new Set([user.id, ...downlineIds])];
          where.OR = [
            { projectManagerId: { in: teamIds } },
            { teamLeadId: { in: teamIds } },
            { tasks: { some: { assignedToId: { in: teamIds } } } },
            { taggedEmployees: { some: { id: { in: teamIds } } } },
            { visibility: "PUBLIC" },
          ];
        } else {
          // Executives see only their personal involvement or public projects
          where.OR = [
            { projectManagerId: user.id },
            { teamLeadId: user.id },
            { tasks: { some: { assignedToId: user.id } } },
            { visibility: "PUBLIC" },
          ];
        }
      }

      // Simple filters
      if (status)   where.status   = status;
      if (type)     where.type     = type;
      if (category) where.category = category;
      if (managerId) {
        // Filter by project manager OR team lead
        const personnelOr = [
          { projectManagerId: managerId },
          { teamLeadId: managerId },
        ];
        if (where.OR) {
          // Merge with existing visibility OR — wrap in AND
          where.AND = [
            { OR: where.OR },
            { OR: personnelOr },
          ];
          delete where.OR;
        } else {
          where.OR = personnelOr;
        }
      }
      if (isRevenueBased !== null)
        where.isRevenueBased = isRevenueBased === "true";

      const projects = await prisma.iTProject.findMany({
        where,
        include: {
          projectManager: { select: { id: true, name: true, email: true } },
          teamLead:       { select: { id: true, name: true, email: true } },
          taggedEmployees: { select: { id: true, name: true, email: true } },
          tasks: {
            select: {
              id: true,
              status: true,
              assignedTo: { select: { id: true, name: true, email: true } },
            },
          },
          website:  { select: { id: true, name: true, url: true, status: true } },
          _count:   { select: { tasks: true, milestones: true, timeEntries: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      // Calculate statistics + the roster of people actually working the project
      const projectsWithStats = projects.map((project) => {
        const totalTasks = project.tasks.length;
        const completedTasks = project.tasks.filter(
          (t) => t.status === "COMPLETED",
        ).length;
        const inProgressTasks = project.tasks.filter(
          (t) => t.status === "IN_PROGRESS",
        ).length;
        const completionRate =
          totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        // Command personnel, tagged employees and anyone holding a task on it, deduped.
        // Someone who appears twice keeps their highest-ranking role.
        const team = new Map<string, TeamMember>();
        const enrol = (person: Personnel | null, role: TeamRole) => {
          if (!person) return;
          const existing = team.get(person.id);
          if (existing) {
            if (TEAM_ROLE_RANK[role] < TEAM_ROLE_RANK[existing.role])
              existing.role = role;
            return;
          }
          team.set(person.id, {
            id: person.id,
            name: person.name,
            email: person.email,
            role,
            openTasks: 0,
            doneTasks: 0,
          });
        };

        enrol(project.projectManager, "Manager");
        enrol(project.teamLead, "Lead");
        project.taggedEmployees.forEach((e) => enrol(e, "Member"));
        project.tasks.forEach((task) => {
          if (!task.assignedTo) return;
          enrol(task.assignedTo, "Contributor");
          const member = team.get(task.assignedTo.id);
          if (!member) return;
          if (task.status === "COMPLETED") member.doneTasks += 1;
          else if (task.status !== "CANCELLED") member.openTasks += 1;
        });

        const roster = [...team.values()].sort(
          (a, b) =>
            TEAM_ROLE_RANK[a.role] - TEAM_ROLE_RANK[b.role] ||
            (a.name || "").localeCompare(b.name || ""),
        );

        return {
          ...project,
          // Keep the historical lightweight shape — callers only ever read id/status.
          tasks: project.tasks.map((t) => ({ id: t.id, status: t.status })),
          team: roster,
          stats: {
            totalTasks,
            completedTasks,
            inProgressTasks,
            completionRate: Math.round(completionRate),
            teamSize: roster.length,
            activeContributors: roster.filter((m) => m.openTasks > 0).length,
          },
        };
      });

      return NextResponse.json(projectsWithStats);
    } catch (error) {
      return handleApiError(error, req.nextUrl.pathname);
    }
  },
);

// POST /api/it/projects - Create new project
export const POST = authorizedRoute(
  IT_MANAGER_ROLES,
  async (req: NextRequest, user) => {
    try {
      const companyId = user.companyId;
      if (!companyId) throw new ValidationError("Company context is required");

      const body = await req.json();
      const validatedData = itProjectSchema.parse(body);

      // Start from current count but retry forward if the generated code is already taken.
      const projectCount = await prisma.iTProject.count({
        where: { companyId },
      });
      const codeYear = new Date().getFullYear();
      let projectCode = "";
      let project = null;

      for (let offset = 1; offset <= 25; offset++) {
        projectCode = `PRJ-${codeYear}-${String(projectCount + offset).padStart(4, "0")}`;
        try {
          project = await prisma.iTProject.create({
            data: {
              company: { connect: { id: companyId } },
              projectCode,
              name: validatedData.name,
              description: validatedData.description,
              about: validatedData.about,
              details: validatedData.details,
              category: validatedData.category,
              type: validatedData.type,
              status: validatedData.status,
              priority: validatedData.priority,
              clientId: validatedData.clientId,
              clientType: validatedData.clientType,
              projectManager: validatedData.projectManagerId
                ? { connect: { id: validatedData.projectManagerId } }
                : undefined,
              teamLead: validatedData.teamLeadId
                ? { connect: { id: validatedData.teamLeadId } }
                : undefined,
              department: validatedData.departmentId
                ? { connect: { id: validatedData.departmentId } }
                : undefined,
              website: validatedData.websiteId
                ? { connect: { id: validatedData.websiteId } }
                : undefined,
              linkedMetric: validatedData.linkedMetricId
                ? { connect: { id: validatedData.linkedMetricId } }
                : undefined,
              startDate: validatedData.startDate
                ? new Date(validatedData.startDate)
                : null,
              endDate: validatedData.endDate
                ? new Date(validatedData.endDate)
                : null,
              estimatedHours: validatedData.estimatedHours
                ? parseFloat(validatedData.estimatedHours.toString())
                : null,
              isRevenueBased: validatedData.isRevenueBased,
              estimatedRevenue: !isNaN(
                parseFloat(validatedData.estimatedRevenue?.toString() || "0"),
              )
                ? parseFloat(validatedData.estimatedRevenue!.toString())
                : 0,
              currency: validatedData.currency,
              itDepartmentCut: !isNaN(
                parseFloat(validatedData.itDepartmentCut?.toString() || "0"),
              )
                ? parseFloat(validatedData.itDepartmentCut!.toString())
                : 0,
              billingType: validatedData.billingType,
              hourlyRate: validatedData.hourlyRate
                ? parseFloat(validatedData.hourlyRate.toString())
                : null,
              tags: validatedData.tags,
              keywords: validatedData.keywords,
              taggedEmployees: validatedData.taggedEmployeeIds?.length
                ? {
                    connect: validatedData.taggedEmployeeIds.map((id: string) => ({
                      id,
                    })),
                  }
                : undefined,
              visibility: validatedData.visibility,
              sharedWithIds: validatedData.sharedWithIds,
              milestones: validatedData.milestones?.length
                ? {
                    create: validatedData.milestones.map((m: any) => ({
                      name: m.name || "Untitled Milestone",
                      description: m.description || "",
                      dueDate: m.dueDate ? new Date(m.dueDate) : new Date(),
                      status: m.status || "PENDING",
                    })),
                  }
                : undefined,
            },
            include: {
              projectManager: { select: { id: true, name: true, email: true } },
              teamLead: { select: { id: true, name: true, email: true } },
              department: { select: { id: true, name: true } },
              website: { select: { id: true, name: true } },
              taggedEmployees: { select: { id: true, name: true, email: true } },
            },
          });
          break;
        } catch (createError: any) {
          if (createError?.code === "P2002") continue;
          throw createError;
        }
      }

      if (!project) {
        throw new ValidationError(
          "Unable to generate a unique project code. Please retry.",
        );
      }

      logger.info("IT project created successfully", {
        projectId: project.id,
        projectCode,
        createdBy: user.id,
      });

      // Handle notifications
      const recipients = new Set<string>();
      validatedData.taggedEmployeeIds?.forEach((id) => {
        if (id !== user.id) recipients.add(id);
      });
      if (
        validatedData.projectManagerId &&
        validatedData.projectManagerId !== user.id
      )
        recipients.add(validatedData.projectManagerId);
      if (validatedData.teamLeadId && validatedData.teamLeadId !== user.id)
        recipients.add(validatedData.teamLeadId);

      for (const recipientId of recipients) {
        await createNotification({
          userId: recipientId,
          title: `You were tagged in a new Project: ${projectCode}`,
          message: `You have been added as a participant to the project "${validatedData.name}".`,
          type: "INFO",
          link: `/dashboard/it-management/projects/${project.id}`,
          channels: ["IN_APP", "EMAIL"],
        });
      }

      return NextResponse.json(project, { status: 201 });
    } catch (error) {
      return handleApiError(error, req.nextUrl.pathname);
    }
  },
);
