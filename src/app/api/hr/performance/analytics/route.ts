
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const employeeId = searchParams.get('employeeId');

            const where: any = {};

            // Filter by Employee
            if (employeeId) {
                where.employeeId = employeeId;
            } else if (user.role === 'MANAGER' || user.role === 'TEAM_LEADER') {
                // If no specific employee requested, limit to items evaluated by this manager?
                // Or strictly require an employeeId for the detailed view.
                // For the "My Team" view, we might want aggregate stats, but let's stick to simple "Per Employee" analytics for now.
                if (!employeeId) {
                    return NextResponse.json({
                        error: 'Employee ID required for detailed analysis. Use separate endpoint for Team Summary.'
                    }, { status: 400 });
                }
            }

            // Fetch all evaluations for the scope
            const evaluations = await prisma.performanceEvaluation.findMany({
                where,
                orderBy: { createdAt: 'asc' }, // Chronological for valid trend
                select: {
                    period: true,
                    periodType: true,
                    rating: true,
                    scores: true,
                    createdAt: true
                }
            });

            // Process for chart consumption
            // Format: { period: "JAN 2025", rating: 4.5, ... }
            const trendData = evaluations.map(ev => ({
                period: ev.period,
                rating: ev.rating || 0,
                date: ev.createdAt
            }));

            // Calculate Average Rating
            const totalRating = evaluations.reduce((sum, ev) => sum + (ev.rating || 0), 0);
            const averageRating = evaluations.length > 0 ? (totalRating / evaluations.length).toFixed(1) : 0;

            return NextResponse.json({
                trendData,
                averageRating,
                totalEvaluations: evaluations.length
            });

        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
