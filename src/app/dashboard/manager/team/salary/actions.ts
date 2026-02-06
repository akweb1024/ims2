'use server';

import { auth } from '@/lib/nextauth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

interface ProposeIncrementData {
    employeeId: string; // EmployeeProfile ID
    currentSalary: number;
    newSalary: number;
    incrementAmount: number;
    percentage: number;
    effectiveDate: string;
    reason: string;
}

export async function proposeIncrement(data: ProposeIncrementData) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: 'Unauthorized' };
    }

    try {
        await prisma.salaryIncrementRecord.create({
            data: {
                employeeProfileId: data.employeeId,
                date: new Date(),
                effectiveDate: new Date(data.effectiveDate),
                oldSalary: data.currentSalary,
                newSalary: data.newSalary,
                incrementAmount: data.incrementAmount,
                percentage: data.percentage,
                reason: data.reason,
                status: 'DRAFT', // Manager proposals start as DRAFT or PENDING_APPROVAL? usually DRAFT until submitted, but let's say DRAFT for now.
                isDraft: true,
                recommendedByUserId: session.user.id,
                type: 'INCREMENT',
            },
        });

        revalidatePath('/dashboard/manager/team/salary');
        return { success: true };
    } catch (error) {
        console.error('Error proposing increment:', error);
        return { success: false, error: 'Failed to create proposal' };
    }
}

export async function getEmployeePerformance(employeeProfileId: string) {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    try {
        const goals = await prisma.employeeGoal.findMany({
            where: { employeeId: employeeProfileId },
            include: {
                evaluations: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            } as any
        });

        if (goals.length === 0) {
            return {
                success: true,
                performance: {
                    avgAchievement: 0,
                    avgEvaluation: 0,
                    goalCount: 0,
                    recommendation: 'No goals found for this period.'
                }
            };
        }

        const totalAchievement = goals.reduce((acc, goal) => acc + ((goal as any).achievementPercentage || 0), 0);
        const avgAchievement = totalAchievement / goals.length;

        const evaluations = goals
            .map(g => (g as any).evaluations?.[0])
            .filter(e => e !== undefined);

        const totalEvaluation = evaluations.reduce((acc, e) => acc + (e.score || 0), 0);
        const avgEvaluation = evaluations.length > 0 ? totalEvaluation / evaluations.length : 0;

        // Recommendation Logic
        let recommendation = 'Standard Increment (5-10%)';
        let suggestedPercentage = 5;

        if (avgAchievement > 90 || avgEvaluation > 9) {
            recommendation = 'Exceeds Expectations (15-20% Increment Suggested)';
            suggestedPercentage = 15;
        } else if (avgAchievement > 75 || avgEvaluation > 7.5) {
            recommendation = 'Strong Performer (10-15% Increment Suggested)';
            suggestedPercentage = 10;
        } else if (avgAchievement < 40) {
            recommendation = 'Needs Improvement (0-5% Increment Suggested)';
            suggestedPercentage = 0;
        }

        return {
            success: true,
            performance: {
                avgAchievement,
                avgEvaluation,
                goalCount: goals.length,
                recommendation,
                suggestedPercentage
            }
        };
    } catch (error) {
        console.error('Error fetching employee performance:', error);
        return { success: false, error: 'Failed to fetch performance data' };
    }
}
