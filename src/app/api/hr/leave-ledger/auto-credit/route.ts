import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
    try {
        // Secure the cron endpoint
        const cronSecret = process.env.CRON_SECRET;
        if (!cronSecret) {
            return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 500 });
        }

        const authHeader = req.headers.get('authorization');
        const expectedAuth = `Bearer ${cronSecret}`;
        
        // Example check: if(!authHeader || authHeader !== expectedAuth)
        // Adjust depending on your actual cron scheduler. If using Vercel Cron, you can check req.headers.get('User-Agent') === 'Vercel-Cron'
        // For general safety, we check the secret here.
        if (authHeader !== expectedAuth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        // Fetch all active employees
        const employees = await prisma.employeeProfile.findMany({
            where: { user: { isActive: true } },
            include: { user: { select: { companyId: true, name: true } } }
        });

        let processedCount = 0;
        let skippedCount = 0;
        const LEAVE_CREDIT = 1.5;

        for (const emp of employees) {
            // Check if already credited for this month in LeaveLedger
            const existingLedger = await prisma.leaveLedger.findUnique({
                where: {
                    employeeId_month_year: {
                        employeeId: emp.id,
                        month: currentMonth,
                        year: currentYear
                    }
                }
            });

            if (existingLedger && (existingLedger.autoCredit || 0) > 0) {
                skippedCount++;
                continue;
            }

            // Get current metrics balances to update them correctly
            const metrics = (emp.metrics as any) || {};
            const currentBalances = metrics.leaveBalances || {
                annual: { total: 0, used: 0 },
                sick: { total: 0, used: 0 },
                casual: { total: 0, used: 0 },
                compensatory: { total: 0, used: 0 }
            };

            // Add exact LEAVE_CREDIT to annual leaves
            const newBalances = {
                ...currentBalances,
                annual: {
                    total: (currentBalances?.annual?.total || 0) + LEAVE_CREDIT,
                    used: currentBalances?.annual?.used || 0
                }
            };

            // Calculate total available 
            const calcType = (typeObj: any) => (typeObj?.total || 0) - (typeObj?.used || 0);
            const availableTotal = 
                calcType(newBalances.annual) + 
                calcType(newBalances.sick) + 
                calcType(newBalances.casual) + 
                calcType(newBalances.compensatory);

            // Update EmployeeProfile
            await prisma.employeeProfile.update({
                where: { id: emp.id },
                data: {
                    metrics: {
                        ...metrics,
                        leaveBalances: newBalances
                    },
                    leaveBalance: availableTotal,
                    currentLeaveBalance: availableTotal
                }
            });

            // Create or update Ledger
            if (existingLedger) {
                await prisma.leaveLedger.update({
                    where: { id: existingLedger.id },
                    data: {
                        autoCredit: LEAVE_CREDIT,
                        closingBalance: availableTotal
                    }
                });
            } else {
                await prisma.leaveLedger.create({
                    data: {
                        employeeId: emp.id,
                        month: currentMonth,
                        year: currentYear,
                        openingBalance: (emp.leaveBalance || emp.currentLeaveBalance || 0),
                        autoCredit: LEAVE_CREDIT,
                        closingBalance: availableTotal,
                        remarks: 'Auto 1.5 Leave Credit',
                        companyId: emp.user?.companyId
                    }
                });
            }

            processedCount++;
        }

        return NextResponse.json({
            message: 'Monthly Leave Credit cron completed',
            month: currentMonth,
            year: currentYear,
            credited: processedCount,
            skipped: skippedCount,
            creditAmount: LEAVE_CREDIT
        });
    } catch (error) {
        logger.error('Error in cron leave credit:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
