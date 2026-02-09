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
        // Fetch Goals and Evaluations
        const goals = await prisma.employeeGoal.findMany({
            where: { employeeId: employeeProfileId },
            include: {
                evaluations: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            } as any
        });

        // Fetch Recent increment reviews (monthly ratings)
        const incrementReviews = await prisma.salaryIncrementReview.findMany({
            where: {
                incrementRecord: {
                    employeeProfileId: employeeProfileId
                }
            },
            orderBy: { date: 'desc' },
            take: 6
        });

        // Fetch general performance reviews
        const generalReviews = await prisma.performanceReview.findMany({
            where: { employeeId: employeeProfileId },
            orderBy: { date: 'desc' },
            take: 3
        });

        // Fetch recent snapshots for revenue consistency
        const snapshots = await prisma.monthlyPerformanceSnapshot.findMany({
            where: { employeeId: employeeProfileId },
            orderBy: [
                { year: 'desc' },
                { month: 'desc' }
            ],
            take: 6
        });

        const totalGoalAchievement = goals.reduce((acc, goal) => acc + ((goal as any).achievementPercentage || 0), 0);
        const avgGoalAchievement = goals.length > 0 ? totalGoalAchievement / goals.length : 0;

        const goalEvaluations = goals
            .map(g => (g as any).evaluations?.[0])
            .filter(e => e !== undefined);
        const avgGoalScore = goalEvaluations.length > 0
            ? goalEvaluations.reduce((acc, e) => acc + (e.score || 0), 0) / goalEvaluations.length
            : 0;

        const avgIncrementRating = incrementReviews.length > 0
            ? incrementReviews.reduce((acc, r) => acc + ((r as any).rating || 0), 0) / incrementReviews.length
            : 0;

        const avgGeneralRating = generalReviews.length > 0
            ? generalReviews.reduce((acc, r) => acc + (r.rating || 0), 0) / generalReviews.length
            : 0;

        const avgSnapshotAchievement = snapshots.length > 0
            ? snapshots.reduce((acc, s) => acc + (s.revenueAchievement || s.overallScore || 0), 0) / snapshots.length
            : 0;

        // Combined score (weighted)
        // Goal Achievement: 30%, Rating: 40%, Snapshot Achievement: 30%
        const combinedAchievement = (avgGoalAchievement * 0.3) + (avgSnapshotAchievement * 0.3) + ((avgIncrementRating || avgGeneralRating || 0) * 20); // Rating 1-5 maps to 0-100? No, let's just use raw values for recommendation.

        // Recommendation Logic
        let recommendation = 'Standard Increment (5-10%)';
        let suggestedPercentage = 5;

        const finalScore = (avgGoalAchievement + avgSnapshotAchievement) / 2;
        const finalRating = (avgIncrementRating + (avgGeneralRating || avgIncrementRating)) / 2;

        if (finalScore > 90 || finalRating >= 4.5) {
            recommendation = 'Exceeds Expectations (15-20% Increment Suggested)';
            suggestedPercentage = 15;
        } else if (finalScore > 75 || finalRating >= 3.5) {
            recommendation = 'Strong Performer (10-15% Increment Suggested)';
            suggestedPercentage = 10;
        } else if (finalScore < 40 || finalRating < 2) {
            recommendation = 'Needs Improvement (0-5% Increment Suggested)';
            suggestedPercentage = 0;
        }

        return {
            success: true,
            performance: {
                avgAchievement: finalScore,
                avgEvaluation: avgGoalScore,
                avgRating: finalRating,
                goalCount: goals.length,
                reviewCount: incrementReviews.length,
                recommendation,
                suggestedPercentage,
                recentRevenue: snapshots[0]?.totalRevenueGenerated || 0
            }
        };
    } catch (error) {
        console.error('Error fetching employee performance:', error);
        return { success: false, error: 'Failed to fetch performance data' };
    }
}
