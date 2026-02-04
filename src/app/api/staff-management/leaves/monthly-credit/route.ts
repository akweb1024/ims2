import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { logger } from '@/lib/logger';

// POST /api/staff-management/leaves/monthly-credit - Trigger monthly leave credit
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'],
    async (req: NextRequest, user) => {
        try {
            // Get all active employees with their profile
            const employees = await prisma.user.findMany({
                where: {
                    isActive: true,
                    employeeProfile: {
                        isNot: null
                    }
                },
                include: {
                    employeeProfile: true
                }
            });

            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();
            const results = {
                success: 0,
                failed: 0,
                details: [] as any[]
            };

            for (const emp of employees) {
                if (!emp.employeeProfile) continue;

                // Check if already credited for this month (optional check, or we assume this runs once)
                // We'll check LeaveLedger for this month
                const existingLedger = await prisma.leaveLedger.findFirst({
                    where: {
                        employeeId: emp.employeeProfile.id,
                        month: currentMonth,
                        year: currentYear
                    }
                });

                // If ledger exists with autoCredit > 0, assume already run?
                // Or we can allow re-run? Let's assume re-run adds more if we are not careful.
                // Better to skip if already processed for safety.
                if (existingLedger && (existingLedger.autoCredit || 0) > 0) {
                    results.details.push({ employee: emp.name, status: 'SKIPPED', reason: 'Already credited' });
                    continue;
                }

                try {
                    // Credit Rules
                    const credits = {
                        annual: 1.5,
                        sick: 0.5,
                        casual: 0.5,
                        compensatory: 0
                    };

                    const metrics = (emp.employeeProfile.metrics as any) || {};
                    const currentBalances = metrics.leaveBalances || {
                        annual: { total: 0, used: 0 },
                        sick: { total: 0, used: 0 },
                        casual: { total: 0, used: 0 },
                        compensatory: { total: 0, used: 0 }
                    };

                    // Calculate new totals
                    const newBalances = {
                        annual: {
                            total: (currentBalances.annual?.total || 0) + credits.annual,
                            used: currentBalances.annual?.used || 0
                        },
                        sick: {
                            total: (currentBalances.sick?.total || 0) + credits.sick,
                            used: currentBalances.sick?.used || 0
                        },
                        casual: {
                            total: (currentBalances.casual?.total || 0) + credits.casual,
                            used: currentBalances.casual?.used || 0
                        },
                        compensatory: {
                            total: (currentBalances.compensatory?.total || 0) + credits.compensatory,
                            used: currentBalances.compensatory?.used || 0
                        }
                    };

                    const totalCredit = credits.annual + credits.sick + credits.casual;
                    const availableTotal =
                        (newBalances.annual.total - newBalances.annual.used) +
                        (newBalances.sick.total - newBalances.sick.used) +
                        (newBalances.casual.total - newBalances.casual.used) +
                        (newBalances.compensatory.total - newBalances.compensatory.used);

                    // Update EmployeeProfile
                    await prisma.employeeProfile.update({
                        where: { id: emp.employeeProfile.id },
                        data: {
                            metrics: {
                                ...metrics,
                                leaveBalances: newBalances
                            },
                            leaveBalance: availableTotal, // Update total float
                            currentLeaveBalance: availableTotal
                        }
                    });

                    // Create/Update Ledger
                    if (existingLedger) {
                        await prisma.leaveLedger.update({
                            where: { id: existingLedger.id },
                            data: {
                                autoCredit: totalCredit,
                                closingBalance: availableTotal
                            }
                        });
                    } else {
                        await prisma.leaveLedger.create({
                            data: {
                                employeeId: emp.employeeProfile.id,
                                month: currentMonth,
                                year: currentYear,
                                openingBalance: (emp.employeeProfile.leaveBalance || 0),
                                autoCredit: totalCredit,
                                closingBalance: availableTotal,
                                remarks: 'Monthly Auto Credit'
                            }
                        });
                    }

                    results.success++;
                    results.details.push({ employee: emp.name, status: 'SUCCESS', credited: totalCredit });

                } catch (err) {
                    console.error(`Failed for ${emp.name}`, err);
                    results.failed++;
                    results.details.push({ employee: emp.name, status: 'FAILED', error: String(err) });
                }
            }

            return NextResponse.json({
                message: 'Monthly credit process completed',
                stats: results
            });
        } catch (error) {
            logger.error('Error in monthly credit:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
);
