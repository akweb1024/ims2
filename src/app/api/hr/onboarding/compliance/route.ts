// ── Onboarding System A: TRAINING / QUIZ MODULES ─────────────────────────────
// Backed by OnboardingModule + OnboardingProgress (statuses LOCKED/UNLOCKED/COMPLETED/FAILED).
// Siblings: onboarding/{modules,progress,compliance}. SEPARATE from the new-hire step
// tracker (System B: onboarding/workflow-state → employeeProfile.metrics.onboardingWorkflow).
// "Onboarded" means different things in each — do not cross-wire the two.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { filterApplicableOnboardingModules } from '@/lib/hr-onboarding';

export const dynamic = 'force-dynamic';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const employee = await prisma.employeeProfile.findUnique({
                where: { userId: user.id },
                include: { user: { include: { department: true } } }
            });

            if (!employee) return createErrorResponse('Profile not found', 404);

            // 1. Check Pending Documents
            const pendingDocs = await prisma.digitalDocument.findMany({
                where: {
                    employeeId: employee.id,
                    status: 'PENDING'
                },
                select: { id: true, title: true }
            });

            // 2. Check Pending Mandatory Modules
            if (!user.companyId) return createErrorResponse('Company context required', 400);

            const requiredModules = await prisma.onboardingModule.findMany({
                where: {
                    isActive: true,
                    OR: [
                        { companyId: user.companyId },
                        { companyId: null },
                    ]
                }
            });

            const applicableModules = filterApplicableOnboardingModules(requiredModules as any[], {
                companyId: user.companyId,
                departmentId: employee.user?.departmentId || null,
                designation: employee.designation,
            });

            const completedProgress = await prisma.onboardingProgress.findMany({
                where: {
                    employeeId: employee.id,
                    status: 'COMPLETED'
                },
                select: { moduleId: true }
            });

            const completedIds = new Set(completedProgress.map((p: any) => (p as any).moduleId));

            const pendingModules = applicableModules
                .filter((m: any) => !completedIds.has(m.id))
                .map((m: any) => ({ id: m.id, title: m.title }));

            return NextResponse.json({
                isCompliant: pendingDocs.length === 0 && pendingModules.length === 0,
                pendingDocuments: pendingDocs,
                pendingModules: pendingModules
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
