import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { createAuditLog } from '@/lib/notifications';

const STEP_KEYS = new Set(['joining', 'verification', 'job', 'perks']);
const STEP_SEQUENCE = ['joining', 'verification', 'job', 'perks'] as const;

async function canAccessProfile(user: any, profileId: string) {
  const profile = await prisma.employeeProfile.findUnique({
    where: { id: profileId },
    include: { user: { select: { id: true, companyId: true } } }
  });
  if (!profile) return { allowed: false, profile: null as any, reason: 'Employee profile not found' };

  if (user.role === 'SUPER_ADMIN') return { allowed: true, profile, reason: '' };
  if (user.companyId && profile.user.companyId && user.companyId !== profile.user.companyId) {
    return { allowed: false, profile, reason: 'Cross-company access denied' };
  }

  if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
    const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
    if (!downline.includes(profile.user.id) && profile.user.id !== user.id) {
      return { allowed: false, profile, reason: 'Employee is outside your team' };
    }
  }

  return { allowed: true, profile, reason: '' };
}

export const GET = authorizedRoute(
  ['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'TEAM_LEADER'],
  async (req: NextRequest, user: any) => {
    try {
      const { searchParams } = new URL(req.url);
      const isSummary = searchParams.get('summary') === 'true';
      const isTeamView = searchParams.get('teamView') === 'true';
      if (isSummary) {
        const where: any = {
          ...(user.role === 'SUPER_ADMIN' ? {} : user.companyId ? { user: { companyId: user.companyId } } : {}),
        };
        if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
          const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
          where.user = { id: { in: [user.id, ...downline] } };
        }

        const profiles = await prisma.employeeProfile.findMany({
          where,
          select: { id: true, metrics: true, createdAt: true }
        });

        let inProgress = 0;
        let blockedAtVerification = 0;
        let blockedAtPerks = 0;
        let pendingApprovals = 0;
        let completedThisMonth = 0;
        let totalDurationDays = 0;
        let durationSamples = 0;
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        for (const p of profiles) {
          const wf = (p.metrics as any)?.onboardingWorkflow;
          if (!wf) continue;
          const status = wf.status || 'ONBOARDING_DRAFT';
          const steps = wf.steps || {};
          if (status === 'ONBOARDING_DRAFT') inProgress += 1;
          if (Boolean(steps.verification?.completed) && !Boolean(steps.verification?.approvedAt)) blockedAtVerification += 1;
          if (Boolean(steps.perks?.completed) && !Boolean(steps.perks?.approvedAt)) blockedAtPerks += 1;
          if (wf.statusDetail === 'PENDING_APPROVAL') pendingApprovals += 1;
          if (status === 'ONBOARDING_COMPLETED' && wf.updatedAt && new Date(wf.updatedAt) >= monthStart) completedThisMonth += 1;

          const completedAt = wf.updatedAt ? new Date(wf.updatedAt) : null;
          if (status === 'ONBOARDING_COMPLETED' && completedAt && !Number.isNaN(completedAt.getTime())) {
            const durationMs = completedAt.getTime() - new Date(p.createdAt).getTime();
            if (durationMs >= 0) {
              totalDurationDays += durationMs / (1000 * 60 * 60 * 24);
              durationSamples += 1;
            }
          }
        }

        return NextResponse.json({
          success: true,
          summary: {
            inProgress,
            blockedAtVerification,
            blockedAtPerks,
            pendingApprovals,
            completedThisMonth,
            avgCompletionDays: durationSamples ? Number((totalDurationDays / durationSamples).toFixed(1)) : 0,
          }
        });
      }
      if (isTeamView) {
        const where: any = {
          ...(user.role === 'SUPER_ADMIN' ? {} : user.companyId ? { user: { companyId: user.companyId } } : {}),
        };
        if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
          const downline = await getDownlineUserIds(user.id, user.companyId || undefined);
          where.user = { id: { in: [user.id, ...downline] } };
        }

        const profiles = await prisma.employeeProfile.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          },
          orderBy: { updatedAt: 'desc' },
          take: 50,
        });

        const actorIds = new Set<string>();
        for (const p of profiles) {
          const wf = (p.metrics as any)?.onboardingWorkflow;
          for (const step of Object.values(wf?.steps || {}) as any[]) {
            if (step?.savedBy) actorIds.add(String(step.savedBy));
            if (step?.reviewedBy) actorIds.add(String(step.reviewedBy));
            if (step?.approvedBy) actorIds.add(String(step.approvedBy));
          }
        }

        const actors = actorIds.size
          ? await prisma.user.findMany({
              where: { id: { in: Array.from(actorIds) } },
              select: { id: true, name: true, email: true }
            })
          : [];
        const actorMap = Object.fromEntries(
          actors.map((a) => [a.id, a.name || a.email || a.id])
        );

        const rows = profiles.map((p) => {
          const wf = ((p.metrics as any)?.onboardingWorkflow || {}) as any;
          const steps = wf?.steps || {};
          return {
            employeeId: p.id,
            userId: p.user?.id || null,
            employeeName: p.user?.name || null,
            employeeEmail: p.user?.email || null,
            designation: p.designation || null,
            status: wf?.status || 'ONBOARDING_DRAFT',
            statusDetail: wf?.statusDetail || 'IN_PROGRESS',
            currentStep: wf?.currentStep || 'joining',
            updatedAt: wf?.updatedAt || null,
            steps: {
              joining: steps?.joining || {},
              verification: steps?.verification || {},
              job: steps?.job || {},
              perks: steps?.perks || {},
            }
          };
        });

        return NextResponse.json({
          success: true,
          rows,
          actorMap,
        });
      }

      const employeeId = String(searchParams.get('employeeId') || '').trim();
      if (!employeeId) return createErrorResponse('employeeId is required', 400);

      const access = await canAccessProfile(user, employeeId);
      if (!access.allowed) return createErrorResponse(access.reason, 403);

      const metrics = (access.profile.metrics || {}) as any;
      const state = metrics?.onboardingWorkflow || {
        version: 1,
        status: 'ONBOARDING_DRAFT',
        steps: {},
        currentStep: 'joining',
        updatedAt: null,
      };
      const actorIds = new Set<string>();
      for (const step of Object.values(state.steps || {}) as any[]) {
        if (step?.savedBy) actorIds.add(String(step.savedBy));
        if (step?.reviewedBy) actorIds.add(String(step.reviewedBy));
        if (step?.approvedBy) actorIds.add(String(step.approvedBy));
      }
      const actors = actorIds.size
        ? await prisma.user.findMany({
            where: { id: { in: Array.from(actorIds) } },
            select: { id: true, name: true, email: true }
          })
        : [];
      const actorMap = Object.fromEntries(
        actors.map((a) => [a.id, a.name || a.email || a.id])
      );

      return NextResponse.json({ success: true, state, employeeId, actorMap });
    } catch (error: any) {
      return createErrorResponse(error?.message || error);
    }
  }
);

export const PATCH = authorizedRoute(
  ['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'TEAM_LEADER'],
  async (req: NextRequest, user: any) => {
    try {
      const body = await req.json();
      const employeeId = String(body?.employeeId || '').trim();
      const step = String(body?.step || '').trim().toLowerCase();
      const completed = Boolean(body?.completed);
      const mode = String(body?.mode || 'NEW').toUpperCase();
      const currentStep = body?.currentStep ? String(body.currentStep).trim().toLowerCase() : null;
      const action = String(body?.action || 'save').trim().toLowerCase();
      const approvalDecision = String(body?.approvalDecision || '').trim().toLowerCase();
      const approvalReason = body?.approvalReason ? String(body.approvalReason).trim() : null;

      if (!employeeId) return createErrorResponse('employeeId is required', 400);
      if (!STEP_KEYS.has(step)) return createErrorResponse('Invalid step', 400);
      if (currentStep && !STEP_KEYS.has(currentStep)) return createErrorResponse('Invalid currentStep', 400);

      const access = await canAccessProfile(user, employeeId);
      if (!access.allowed) return createErrorResponse(access.reason, 403);

      const metrics = (access.profile.metrics || {}) as any;
      const prevState = metrics?.onboardingWorkflow || {
        version: 1,
        status: 'ONBOARDING_DRAFT',
        mode,
        steps: {},
        currentStep: 'joining',
        updatedAt: null,
      };

      const nextSteps = { ...(prevState.steps || {}) } as any;
      if (action === 'approve') {
        if (!['verification', 'perks'].includes(step)) return createErrorResponse('Approval is only supported for verification and perks steps', 400);
        if (!['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'MANAGER'].includes(user.role)) return createErrorResponse('You are not allowed to approve onboarding steps', 403);
        const isRejected = approvalDecision === 'rejected';
        nextSteps[step] = {
          ...(nextSteps[step] || {}),
          completed: Boolean(nextSteps[step]?.completed),
          approvedAt: isRejected ? null : new Date().toISOString(),
          approvedBy: isRejected ? null : user.id,
          approvalDecision: approvalDecision || 'approved',
          approvalReason,
          reviewedAt: new Date().toISOString(),
          reviewedBy: user.id,
        };
      } else {
        if (completed) {
          const idx = STEP_SEQUENCE.indexOf(step as any);
          if (idx > 0) {
            const prevStep = STEP_SEQUENCE[idx - 1];
            if (!Boolean(nextSteps?.[prevStep]?.completed)) {
              return createErrorResponse(`Please complete ${prevStep} before ${step}`, 400);
            }
          }
        }
        nextSteps[step] = {
          ...(nextSteps[step] || {}),
          completed,
          savedAt: new Date().toISOString(),
          savedBy: user.id,
        };
      }

      const allDone = ['joining', 'verification', 'job', 'perks'].every((key) => Boolean(nextSteps[key]?.completed));
      const verificationApproved = Boolean(nextSteps.verification?.approvedAt);
      const perksApproved = Boolean(nextSteps.perks?.approvedAt);
      const pendingApproval = allDone && (!verificationApproved || !perksApproved);
      const nextState = {
        ...prevState,
        version: 1,
        mode,
        status: allDone && verificationApproved && perksApproved ? 'ONBOARDING_COMPLETED' : 'ONBOARDING_DRAFT',
        statusDetail: pendingApproval ? 'PENDING_APPROVAL' : allDone ? 'READY_TO_COMPLETE' : 'IN_PROGRESS',
        steps: nextSteps,
        lastSavedStep: step,
        currentStep: currentStep || prevState.currentStep || step,
        updatedAt: new Date().toISOString(),
      };

      const updated = await prisma.employeeProfile.update({
        where: { id: employeeId },
        data: {
          metrics: {
            ...(metrics || {}),
            onboardingWorkflow: nextState,
          }
        },
        select: { id: true }
      });

      await createAuditLog({
        userId: user.id,
        action: action === 'approve' ? 'HR_ONBOARDING_STEP_APPROVAL' : 'HR_ONBOARDING_STEP_SAVE',
        entity: 'employee_onboarding_workflow',
        entityId: updated.id,
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'UNKNOWN',
        changes: {
          employeeId,
          step,
          completed,
          mode,
          status: nextState.status,
          currentStep: nextState.currentStep,
          action,
          approvalDecision: approvalDecision || null,
          approvalReason,
        }
      });

      return NextResponse.json({ success: true, state: nextState, employeeId: updated.id });
    } catch (error: any) {
      return createErrorResponse(error?.message || error);
    }
  }
);
