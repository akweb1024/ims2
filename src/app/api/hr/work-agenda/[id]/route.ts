import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { decodeAgendaMetadata, encodeAgendaMetadata } from '@/lib/hr/work-agenda';
import { createAuditLog } from '@/lib/notifications';
import { notifyBlockerTransition } from '@/lib/hr/blocker-notifications';
import { isPriorityChange, recordPriorityChange, PRIORITY_COMMENT_REQUIRED } from '@/lib/hr/priority-audit';

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

      const priorityChanging = isPriorityChange(plan.priority, body.priority);
      const priorityChangeComment = typeof body.priorityChangeComment === 'string' ? body.priorityChangeComment.trim() : '';
      if (priorityChanging && !priorityChangeComment) {
        return createErrorResponse(PRIORITY_COMMENT_REQUIRED, 400);
      }

      const metadata = decodeAgendaMetadata(plan.strategy) || {
        version: 1 as const,
        sourceType: 'MANAGER_OVERRIDE' as const,
      };

      if (body.blockerReason !== undefined) {
        metadata.blockerReason = body.blockerReason ? String(body.blockerReason) : null;
      }
      if (body.blockerOwner !== undefined) {
        metadata.blockerOwner = body.blockerOwner ? String(body.blockerOwner) : null;
      }
      // Leaving BLOCKED clears the blocker fields unless the caller sent new ones —
      // a stale blockerReason keeps counting as an unresolved blocker in guardRails.
      if (completionStatus && completionStatus !== 'BLOCKED' && plan.completionStatus === 'BLOCKED') {
        if (body.blockerReason === undefined) metadata.blockerReason = null;
        if (body.blockerOwner === undefined) metadata.blockerOwner = null;
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

      if (body.employeeId && isManagerial) {
        const targetEmployeeId = String(body.employeeId);
        const targetProfile = await prisma.employeeProfile.findUnique({
          where: { id: targetEmployeeId },
          include: { user: { select: { id: true, companyId: true } } }
        });
        if (!targetProfile) return createErrorResponse('Target employee not found', 404);
        if (user.role !== 'SUPER_ADMIN' && user.companyId && targetProfile.user.companyId && targetProfile.user.companyId !== user.companyId) {
          return createErrorResponse('Forbidden: cross-company reassignment is not allowed', 403);
        }
        if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
          const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
          if (!downline.includes(targetProfile.user.id) && targetProfile.user.id !== user.id) {
            return createErrorResponse('Forbidden: target employee not in your team', 403);
          }
        }
      }

      const updated = await prisma.workPlan.update({
        where: { id },
        data: updateData,
        include: {
          employee: { include: { user: { select: { id: true, name: true, email: true } } } },
          linkedGoal: { select: { id: true, title: true } }
        }
      });

      try {
        await notifyBlockerTransition({
          previousStatus: plan.completionStatus,
          nextStatus: updated.completionStatus,
          employeeUserId: (updated.employee as any)?.user?.id || plan.employee.userId,
          actorUserId: user.id,
          agenda: updated.agenda,
          blockerReason: metadata.blockerReason,
          blockerOwner: metadata.blockerOwner,
        });
      } catch (notifyErr) {
        console.error('Blocker notification failed (non-fatal):', notifyErr);
      }

      if (priorityChanging) {
        try {
          await recordPriorityChange({
            entity: 'work_plan',
            entityId: plan.id,
            userId: user.id,
            from: plan.priority,
            to: updated.priority,
            comment: priorityChangeComment,
          });
        } catch (auditErr) {
          console.error('Priority-change audit failed (non-fatal):', auditErr);
        }
      }

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
