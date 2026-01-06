import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Get Full User Context
        const userContext = await prisma.user.findUnique({
            where: { id: user.id },
            include: {
                department: true,
                employeeProfile: true
            }
        });

        if (!userContext || !userContext.employeeProfile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        const employee = userContext.employeeProfile;
        const departmentId = userContext.departmentId;

        const companyId = (user as any).companyId;

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
                        requiredForDesignation: employee.designation // Simple exact match for now, or null for all roles? User context implies specific role test.
                        // If requiredForDesignation is null on a ROLE module, it implies "All Roles"? Or should we be strict?
                        // Let's assume if requiredForDesignation is null, it applies to everyone (which makes it like Company).
                        // Better: Matches if null OR matches designation.
                    }
                ]
            },
            include: {
                questions: {
                    select: { id: true, question: true, options: true } // Don't send correct answer
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
            let currentProgress = progressMap.get(mod.id) as any;

            if (currentProgress) {
                status = currentProgress.status;
                score = currentProgress.score;
            }

            // Logic to unlock
            if (status === 'LOCKED' && isPreviousCompleted) {
                status = 'UnloCKED'; // Temporary state for UI, or update DB?
                // Let's update DB lazily or just return computed status
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

            result.push({
                ...mod,
                progress: {
                    status,
                    score,
                    completedAt: currentProgress?.completedAt
                }
            });
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error('Onboarding Progress Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { moduleId, answers } = body; // answers: { questionId: index }

        if (!moduleId || !answers) {
            return NextResponse.json({ error: 'Missing data' }, { status: 400 });
        }

        const employee = await prisma.employeeProfile.findFirst({ where: { userId: user.id } });
        if (!employee) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

        // Fetch Module/Questions (inc correct answers)
        const module = await prisma.onboardingModule.findUnique({
            where: { id: moduleId },
            include: { questions: true }
        });

        if (!module) return NextResponse.json({ error: 'Module not found' }, { status: 404 });

        // Calculate Score
        let correctCount = 0;
        module.questions.forEach(q => {
            if (answers[q.id] === q.correctAnswer) {
                correctCount++;
            }
        });

        const totalQuestions = module.questions.length;
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
        console.error('Submit Quiz Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
