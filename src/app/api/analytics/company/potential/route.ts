import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

const calculatePotential = async (companyId: string) => {
    // Fetch current metrics to calculate potential
    const stats = await prisma.financialRecord.findMany({
        where: { companyId, type: 'REVENUE' },
        orderBy: { date: 'desc' },
        take: 12
    });

    const avgMonthlyRevenue = stats.length > 0
        ? stats.reduce((acc, curr) => acc + curr.amount, 0) / stats.length
        : 100000; // Mock fallback

    // Simple projections (could be way more complex with real data/AI)
    const growthRate = 1.05; // 5% growth per period

    return {
        monthlyPotential: avgMonthlyRevenue * growthRate,
        quarterlyPotential: avgMonthlyRevenue * 3 * Math.pow(growthRate, 2),
        halfYearlyPotential: avgMonthlyRevenue * 6 * Math.pow(growthRate, 4),
        yearlyPotential: avgMonthlyRevenue * 12 * Math.pow(growthRate, 8),
        twoYearPotential: avgMonthlyRevenue * 24 * Math.pow(growthRate, 16),
        threeYearPotential: avgMonthlyRevenue * 36 * Math.pow(growthRate, 24),
        fiveYearPotential: avgMonthlyRevenue * 60 * Math.pow(growthRate, 40),
        lastCalculated: new Date()
    };
};

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            if (!user.companyId) return createErrorResponse('Company association required', 403);

            let potential = await prisma.companyPotential.findUnique({
                where: { companyId: user.companyId }
            });

            // Check if refresh needed (older than 1 hour or null)
            const shouldRecalculate = !potential ||
                (new Date().getTime() - new Date(potential.lastCalculated).getTime() > 1000 * 60 * 60);

            if (shouldRecalculate) {
                const potentialData = await calculatePotential(user.companyId);

                potential = await prisma.companyPotential.upsert({
                    where: { companyId: user.companyId },
                    update: potentialData,
                    create: {
                        companyId: user.companyId,
                        ...potentialData,
                        growthFactors: [
                            { factor: "Market Expansion", impact: "High", importance: 9 },
                            { factor: "Employee Productivity", impact: "Medium", importance: 7 },
                            { factor: "Cost Optimization", impact: "High", importance: 8 }
                        ],
                        marketData: { trend: "Positive", industryGrowth: "12% YoY" }
                    }
                });
            }

            return NextResponse.json(potential);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user) => {
        try {
            if (!user.companyId) return createErrorResponse('Company association required', 403);

            const potentialData = await calculatePotential(user.companyId);

            const potential = await prisma.companyPotential.upsert({
                where: { companyId: user.companyId },
                update: potentialData,
                create: {
                    companyId: user.companyId,
                    ...potentialData,
                    growthFactors: [
                        { factor: "Global Digital Adoption", impact: "Accelerating", importance: 10 },
                        { factor: "Internal Automation", impact: "High", importance: 8 },
                        { factor: "Market Competitiveness", impact: "Medium", importance: 6 }
                    ]
                }
            });

            return NextResponse.json(potential);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
