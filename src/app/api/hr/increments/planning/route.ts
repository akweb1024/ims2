import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const companyId = searchParams.get('companyId') || user.companyId;

            if (!companyId && user.role !== 'SUPER_ADMIN') {
                return createErrorResponse('Company ID required', 400);
            }

            // Define the where clause based on user role
            const whereClause: any = {
                isActive: true,
                role: { notIn: ['CUSTOMER', 'SUPER_ADMIN'] }
            };

            if (user.role !== 'SUPER_ADMIN') {
                whereClause.companyId = companyId;

                // If Manager/TL, they might only see their downline. 
                // However, user requested "admin and manager can see the data related to them only"
                // For a planning page, we usually want managers to see their subordinates.
                if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                    whereClause.managerId = user.id;
                }
            } else if (companyId) {
                whereClause.companyId = companyId;
            }

            // 1. Fetch Employees with Salary Info and Increment History
            const employees = await prisma.user.findMany({
                where: whereClause,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    department: { select: { id: true, name: true } },
                    employeeProfile: {
                        select: {
                            id: true,
                            designation: true,
                            baseSalary: true,
                            lastIncrementDate: true,
                            incrementHistory: {
                                orderBy: { date: 'desc' },
                                take: 5
                            },
                            workReports: {
                                take: 20,
                                orderBy: { date: 'desc' },
                                select: {
                                    tasksCompleted: true,
                                    revenueGenerated: true,
                                    managerRating: true
                                }
                            }
                        }
                    }
                }
            });

            const pendingIncrements = await prisma.salaryIncrementRecord.findMany({
                where: {
                    status: 'RECOMMENDED',
                    employeeProfile: {
                        user: { companyId: companyId || undefined }
                    }
                } as any
            });

            // 3. Simple Company Growth Context (Last 12 months)
            let growthStats = null;
            if (companyId) {
                const twelveMonthsAgo = new Date();
                twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);

                const revenue = await prisma.invoice.aggregate({
                    where: { companyId, status: 'PAID', createdAt: { gte: twelveMonthsAgo } } as any,
                    _sum: { total: true }
                });

                const payroll = await prisma.salarySlip.aggregate({
                    where: { companyId, status: 'PAID', generatedAt: { gte: twelveMonthsAgo } } as any,
                    _sum: { ctc: true }
                });

                growthStats = {
                    annualRevenue: revenue._sum?.total || 0,
                    annualPayroll: payroll._sum?.ctc || 0,
                    profitability: (revenue._sum?.total || 0) - (payroll._sum?.ctc || 0)
                };
            }

            // Process data for frontend
            const items = employees.map(emp => {
                const profile = emp.employeeProfile;
                if (!profile) return null;

                const pending = pendingIncrements.find(p => p.employeeProfileId === profile.id);
                const reports = profile.workReports || [];
                const avgRating = reports.length > 0
                    ? reports.reduce((sum, r) => sum + (r.managerRating || 0), 0) / reports.length
                    : 0;

                return {
                    id: emp.id,
                    profileId: profile.id,
                    name: emp.name || emp.email.split('@')[0],
                    department: emp.department?.name || 'Unassigned',
                    designation: profile.designation,
                    currentSalary: profile.baseSalary || 0,
                    lastIncrementDate: profile.lastIncrementDate,
                    performance: {
                        avgRating: avgRating.toFixed(1),
                        revenueGenerated: reports.reduce((sum, r) => sum + (r.revenueGenerated || 0), 0)
                    },
                    pendingRecommendation: pending ? {
                        id: pending.id,
                        newSalary: pending.newSalary,
                        incrementAmount: pending.incrementAmount,
                        percentage: pending.percentage,
                        reason: pending.reason,
                        type: pending.type,
                        effectiveDate: pending.effectiveDate
                    } : null
                };
            }).filter(Boolean);

            return NextResponse.json({
                items,
                growthStats,
                companyId
            });

        } catch (error) {
            console.error('Increment Planning Error:', error);
            return createErrorResponse(error);
        }
    }
);
