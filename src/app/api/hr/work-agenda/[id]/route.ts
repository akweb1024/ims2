import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { decodeAgendaMetadata, encodeAgendaMetadata } from '@/lib/hr/work-agenda';
import { createAuditLog } from '@/lib/notifications';

const VALID_STATUSES = new Set(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED']);

export const PATCH = authorizedRoute(
  ['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'],
  async (req: NextRequest, user: any, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;
      const body = await req.json();

      const plan = await prisma.workPlan.findUnique({
        where: { id },
        include: { employee: { select: { id: true, userId: true } } }
      });
      if (!plan) return createErrorResponse('Agenda item not found', 404);

      const isOwner = plan.employee.userId === user.id;
      const isManagerial = ['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'TEAM_LEADER'].includes(user.role);

      if (!isOwner && !isManagerial) return createErrorResponse('Forbidden', 403);
      if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
        const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
        if (!downline.includes(plan.employee.userId) && plan.employee.userId !== user.id) {
          return createErrorResponse('Forbidden: employee not in your team', 403);
        }
      }

      const completionStatus = body.completionStatus ? String(body.completionStatus) : undefined;
      if (completionStatus && !VALID_STATUSES.has(completionStatus)) {
        return createErrorResponse('Invalid completionStatus', 400);
      }

      const metadata = decodeAgendaMetadata(plan.strategy) || {
        version: 1 as const,
        sourceType: 'MANAGER_OVERRIDE' as const,
      };

      if (body.blockerReason !== undefined) {
        metadata.blockerReason = body.blockerReason ? String(body.blockerReason) : null;
      }
      if (body.mandatory !== undefined) {
        metadata.mandatory = Boolean(body.mandatory);
      }
      if (body.sequence !== undefined) {
        metadata.sequence = Number(body.sequence) || metadata.sequence || 999;
      }
      if (body.conflictFlag !== undefined) {
        metadata.conflictFlag = Boolean(body.conflictFlag);
      }
      if (isManagerial) metadata.overrideBy = user.id;
      if (body.linkedKpiId !== undefined) metadata.linkedKpiId = body.linkedKpiId || null;

      const updateData: any = {
        ...(completionStatus ? { completionStatus } : {}),
        ...(body.agenda ? { agenda: String(body.agenda) } : {}),
        ...(body.priority ? { priority: String(body.priority) } : {}),
        ...(body.estimatedHours !== undefined ? { estimatedHours: body.estimatedHours === null ? null : Number(body.estimatedHours) } : {}),
        ...(body.actualHours !== undefined ? { actualHours: body.actualHours === null ? null : Number(body.actualHours) } : {}),
        ...(body.linkedGoalId !== undefined ? { linkedGoalId: body.linkedGoalId || null } : {}),
        ...(body.employeeId && isManagerial ? { employeeId: String(body.employeeId) } : {}),
        strategy: encodeAgendaMetadata(metadata),
      };

      const updated = await prisma.workPlan.update({
        where: { id },
        data: updateData,
        include: {
          employee: { include: { user: { select: { name: true, email: true } } } },
          linkedGoal: { select: { id: true, title: true } }
        }
      });

      if (isManagerial) {
        await createAuditLog({
          userId: user.id,
          action: 'HR_WORK_AGENDA_OVERRIDE',
          entity: 'work_plan',
          entityId: plan.id,
          ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'UNKNOWN',
          changes: {
            employeeIdBefore: plan.employeeId,
            employeeIdAfter: updated.employeeId,
            completionStatusBefore: plan.completionStatus,
            completionStatusAfter: updated.completionStatus,
            priorityBefore: plan.priority,
            priorityAfter: updated.priority,
            mandatory: metadata.mandatory ?? false,
            blockerReason: metadata.blockerReason ?? null,
          }
        });
      }

      return NextResponse.json(updated);
    } catch (error: any) {
      return createErrorResponse(error?.message || error);
    }
  }
);
