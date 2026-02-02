import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user) => {
        try {
            if (!user.companyId) return createErrorResponse('Company association required', 403);

            let potential = await prisma.companyPotential.findUnique({
                where: { companyId: user.companyId }
            });

            if (!potential) {
                // Initialize if not exists
                potential = await prisma.companyPotential.create({
                    data: {
                        companyId: user.companyId,
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

            // 1. Fetch Actual Revenue (Last 12 Months)
            const twelveMonthsAgo = new Date();
            twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

            const financialRecords = await prisma.financialRecord.findMany({
                where: {
                    companyId: user.companyId,
                    type: 'REVENUE',
                    date: { gte: twelveMonthsAgo }
                },
                orderBy: { date: 'desc' }
            });

            const totalRevenueLast12M = financialRecords.reduce((sum, r) => sum + r.amount, 0);
            const avgMonthlyRevenue = financialRecords.length > 0
                ? totalRevenueLast12M / 12 // Normalize to 12 months even if less data
                : 0;

            // 2. Fetch Employee Targets & Headcount
            const employees = await prisma.employeeProfile.findMany({
                where: {
                    user: {
                        companyId: user.companyId,
                        isActive: true
                    }
                },
                select: {
                    id: true,
                    monthlyTarget: true,
                    user: { select: { createdAt: true } }
                }
            });

            const activeHeadcount = employees.length;
            const totalMonthlyTarget = employees.reduce((sum, e) => sum + (e.monthlyTarget || 0), 0);

            // 3. Determine Baseline Potential
            // Potential should be at least the sum of all targets, or current revenue * growth factor
            const baselinePotential = Math.max(avgMonthlyRevenue, totalMonthlyTarget);

            // 4. Calculate Dynamic Growth Factor
            // If we have distinct revenue records from 3 months ago vs recent, calculate trend
            // Fallback to 5% if no data
            let growthRate = 1.05;

            // Simple trend analysis
            if (financialRecords.length >= 6) {
                const recent3Months = financialRecords.slice(0, 3).reduce((sum, r) => sum + r.amount, 0);
                const prev3Months = financialRecords.slice(3, 6).reduce((sum, r) => sum + r.amount, 0);
                if (prev3Months > 0) {
                    const trend = recent3Months / prev3Months;
                    // Cap extreme growth for realism (e.g. max 20% quarter over quarter)
                    growthRate = Math.min(Math.max(trend, 0.9), 1.20);
                }
            }

            // 5. Calculate Projections
            const potentialData = {
                monthlyPotential: baselinePotential * growthRate,
                quarterlyPotential: baselinePotential * 3 * Math.pow(growthRate, 1.5), // Compound a bit
                halfYearlyPotential: baselinePotential * 6 * Math.pow(growthRate, 3),
                yearlyPotential: baselinePotential * 12 * Math.pow(growthRate, 6),
                twoYearPotential: baselinePotential * 24 * Math.pow(growthRate, 12),
                threeYearPotential: baselinePotential * 36 * Math.pow(growthRate, 18),
                fiveYearPotential: baselinePotential * 60 * Math.pow(growthRate, 30),
                lastCalculated: new Date()
            };

            // 6. determine Factors
            const growthFactors = [
                {
                    factor: "Active Workforce Capability",
                    impact: activeHeadcount > 10 ? "High" : "Medium",
                    importance: 9
                },
                {
                    factor: "Revenue Trajectory",
                    impact: growthRate > 1.05 ? "Accelerating" : (growthRate > 1.0 ? "Stable" : "Declining"),
                    importance: 10
                },
                {
                    factor: "Target Efficiency",
                    impact: (totalMonthlyTarget > avgMonthlyRevenue) ? "High Potential" : "Optimized",
                    importance: 8
                }
            ];

            const potential = await prisma.companyPotential.upsert({
                where: { companyId: user.companyId },
                update: {
                    ...potentialData,
                    growthFactors
                },
                create: {
                    companyId: user.companyId,
                    ...potentialData,
                    growthFactors,
                    marketData: { trend: growthRate > 1.02 ? "Bullish" : "Stabilizing", industryGrowth: "Global Avg" }
                }
            });

            return NextResponse.json(potential);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
