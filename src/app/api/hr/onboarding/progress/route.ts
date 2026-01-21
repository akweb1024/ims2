import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

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
                    companyId,
                    isActive: true,
                    OR: [
                        { type: 'COMPANY' },
                        {
                            type: 'DEPARTMENT',
                            departmentId: departmentId
                        },
                        {
                            type: 'ROLE',
                            requiredForDesignation: employee.designation
                        }
                    ]
                },
                include: {
                    questions: {
                        select: { id: true, question: true, options: true }
                    }
                },
                orderBy: { order: 'asc' }
            });

            // Fetch existing progress
            const existingProgress = await prisma.onboardingProgress.findMany({
                where: { employeeId: employee.id }
            });

            const progressMap = new Map(existingProgress.map((p: any) => [p.moduleId, p]));

            // Calculate statuses and prepare response
            let isPreviousCompleted = true; // First one is unlocked by default
            const result = [];

            for (const mod of allModules) {
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

                // Replace Keywords (e.g., {{COMPANY_NAME}})
                const companyName = userContext.company?.name || 'the Company';
                const processedContent = (mod.content || '').replace(/\{\{COMPANY_NAME\}\}/g, companyName);

                result.push({
                    ...mod,
                    content: processedContent,
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
