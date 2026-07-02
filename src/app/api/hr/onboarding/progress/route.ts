// ── Onboarding System A: TRAINING / QUIZ MODULES ─────────────────────────────
// Backed by OnboardingModule + OnboardingProgress (statuses LOCKED/UNLOCKED/COMPLETED/FAILED).
// Siblings: onboarding/{modules,progress,compliance}. SEPARATE from the new-hire step
// tracker (System B: onboarding/workflow-state → employeeProfile.metrics.onboardingWorkflow).
// "Onboarded" means different things in each — do not cross-wire the two.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { filterApplicableOnboardingModules, applyCompanyPlaceholders } from '@/lib/hr-onboarding';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            // Get Full User Context
            const userContext = await prisma.user.findUnique({
                where: { id: user.id },
                include: {
                    department: true,
                    employeeProfile: true,
                    company: true
                }
            });

            if (!userContext || !userContext.employeeProfile) {
                return createErrorResponse('Profile not found', 404);
            }

            const employee = userContext.employeeProfile;
            const departmentId = userContext.departmentId;
            const companyId = user.companyId;

            if (!companyId) return createErrorResponse('Company association required', 403);

            // Fetch all relevant modules
            const allModules = await prisma.onboardingModule.findMany({
                where: {
                    isActive: true,
                    OR: [
                        { companyId }, // Company Specific
                        { companyId: null }, // Global Modules
                    ],
                    // Apply filtering logic in application or refine query if needed
                    // For now, let's fetch possibly relevant and filter in memory if complex OR logic is tricky with standard prisma in one go
                    // Actually, let's just stick to the specific conditions as requested:
                    // OR: [
                    //     { companyId, type: 'COMPANY' },
                    //     { companyId: null }, // Global
                    //     { companyId, type: 'DEPARTMENT', departmentId },
                    //     { companyId, type: 'ROLE', requiredForDesignation: employee.designation }
                    // ]
                    // Simplified query to ensure we capture all potential matches:
                },
                include: {
                    questions: {
                        select: { id: true, question: true, options: true }
                    }
                },
                orderBy: { order: 'asc' }
            });

            // Filter in memory for specific Department/Role logic if needed, OR refine the query:
            // The previous query had specific OR conditions. Let's adapt that to include global.
            const filteredModules = filterApplicableOnboardingModules(allModules as any[], {
                companyId,
                departmentId,
                designation: employee.designation,
            });


            // Fetch existing progress
            const existingProgress = await prisma.onboardingProgress.findMany({
                where: { employeeId: employee.id }
            });

            const progressMap = new Map(existingProgress.map((p: any) => [p.moduleId, p]));

            // Calculate statuses and prepare response
            let isPreviousCompleted = true; // First one is unlocked by default
            const result = [];

            for (const mod of filteredModules) {
                let status = 'LOCKED';
                let score = null;
                const currentProgress = progressMap.get(mod.id);

                if (currentProgress) {
                    status = (currentProgress as any).status;
                    score = (currentProgress as any).score;
                }

                // Logic to unlock
                if (status === 'LOCKED' && isPreviousCompleted) {
                    status = 'UNLOCKED';
                }

                // If this is the *very first* module and no progress exists, unlock it
                if (result.length === 0 && !currentProgress) {
                    status = 'UNLOCKED';
                }

                // If previous was completed, unlock this one
                if (isPreviousCompleted && (status === 'LOCKED')) {
                    status = 'UNLOCKED';
                }

                // Update IsPrevious for next iteration
                isPreviousCompleted = (status === 'COMPLETED');

                // Replace Keywords (e.g., {{COMPANY_NAME}}) - Case insensitive and robust
                const companyName = userContext.company?.name;

                result.push({
                    ...mod,
                    content: applyCompanyPlaceholders(mod.content, companyName),
                    description: applyCompanyPlaceholders(mod.description, companyName),
                    progress: {
                        status,
                        score,
                        completedAt: (currentProgress as any)?.completedAt
                    }
                });
            }

            return NextResponse.json(result);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { moduleId, answers } = body; // answers: { questionId: index }

            if (!moduleId || !answers) {
                return createErrorResponse('Missing data', 400);
            }

            const employee = await prisma.employeeProfile.findFirst({ where: { userId: user.id } });
            if (!employee) return createErrorResponse('Profile not found', 404);

            // Fetch Module/Questions (inc correct answers)
            const foundModule = await prisma.onboardingModule.findUnique({
                where: { id: moduleId },
                include: { questions: true }
            });

            if (!foundModule) return createErrorResponse('Module not found', 404);

            // Calculate Score
            let correctCount = 0;
            foundModule.questions.forEach(q => {
                if (answers[q.id] === q.correctAnswer) {
                    correctCount++;
                }
            });

            const totalQuestions = foundModule.questions.length;
            const scorePercentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 100;
            const passed = scorePercentage >= 70; // 70% passing mark

            // Update Progress
            const status = passed ? 'COMPLETED' : 'FAILED';

            const progress = await prisma.onboardingProgress.upsert({
                where: {
                    employeeId_moduleId: {
                        employeeId: employee.id,
                        moduleId: moduleId
                    }
                },
                update: {
                    status,
                    score: scorePercentage,
                    completedAt: passed ? new Date() : null
                },
                create: {
                    employeeId: employee.id,
                    moduleId,
                    status,
                    score: scorePercentage,
                    completedAt: passed ? new Date() : null
                }
            });

            return NextResponse.json({
                passed,
                score: scorePercentage,
                status,
                progress
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
