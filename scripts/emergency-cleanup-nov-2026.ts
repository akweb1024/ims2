import { prisma } from '../src/lib/prisma';

const CLEANUP_CONFIRMATION = 'DELETE_NOVEMBER_2026_LEAVE_LEDGER';

function assertEmergencyCleanupAllowed() {
    if (process.env.ALLOW_EMERGENCY_LEAVE_CLEANUP !== 'true') {
        throw new Error(
            'Emergency cleanup aborted: this script deletes leave-ledger rows and rewrites employee leave balances. Set ALLOW_EMERGENCY_LEAVE_CLEANUP=true only after taking a backup.'
        );
    }

    if (process.env.CONFIRM_EMERGENCY_LEAVE_CLEANUP !== CLEANUP_CONFIRMATION) {
        throw new Error(
            `Emergency cleanup aborted: set CONFIRM_EMERGENCY_LEAVE_CLEANUP=${CLEANUP_CONFIRMATION} to confirm the targeted ledger repair.`
        );
    }
}

async function cleanup() {
    console.log('🧹 Starting Emergency Cleanup for November 2026...');
    assertEmergencyCleanupAllowed();

    const targetYear = 2026;
    const targetMonth = 11;
    const currentYear = 2026;
    const currentMonth = 2; // February

    try {
        // 1. Delete erroneous November 2026 records
        console.log(`🗑️ Deleting erroneous ${targetMonth}/${targetYear} ledger entries...`);
        const deleted = await prisma.leaveLedger.deleteMany({
            where: { year: targetYear, month: targetMonth }
        });
        console.log(`✅ Deleted ${deleted.count} entries.`);

        // 2. Recalculate Profiles for all employees
        console.log('🔄 Restoring balance to February 2026 closing state...');
        const employees = await prisma.employeeProfile.findMany({
            include: {
                leaveLedgers: {
                    where: { year: currentYear, month: currentMonth }
                }
            }
        });

        for (const emp of employees) {
            const currentLedger = emp.leaveLedgers[0];

            // If February ledger exists, use its closing balance. 
            // Otherwise, we don't reset unless we are sure.
            if (!currentLedger) {
                console.log(`⚠️ Warning: No 02/2026 ledger found for employee ${emp.id}. Skipping balance reset.`);
                continue;
            }

            const correctBalance = currentLedger.closingBalance;

            console.log(`- Updating ${emp.id}: Setting balance back to ${correctBalance}`);

            // Sync Profile Balance
            let metrics = emp.metrics as any || {};
            if (metrics.leaveBalances) {
                // The 'used' count in metrics should ideally matching the Approved requests for THIS YEAR.
                // Since we are fixing the future month (Nov), the 'used' count shouldn't have been affected 
                // by the Nov ledger yet (as it's usually current year requests that matter).
                // However, we'll recalculate metrics to be safe.

                const approvedRequests = await prisma.leaveRequest.findMany({
                    where: {
                        employeeId: emp.id,
                        status: 'APPROVED',
                        startDate: {
                            gte: new Date(`${currentYear}-01-01`),
                            lte: new Date(`${currentYear}-12-31`)
                        }
                    }
                });

                // Reset used counts
                metrics.leaveBalances.sick.used = 0;
                metrics.leaveBalances.casual.used = 0;
                metrics.leaveBalances.annual.used = 0;
                metrics.leaveBalances.compensatory.used = 0;

                const typeMapping: Record<string, string> = {
                    'SICK': 'sick',
                    'CASUAL': 'casual',
                    'EARNED': 'annual',
                    'ANNUAL': 'annual',
                    'COMPENSATORY': 'compensatory'
                };

                for (const req of approvedRequests) {
                    const start = new Date(req.startDate);
                    const end = new Date(req.endDate);
                    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    const bucket = typeMapping[req.type] || 'annual';
                    metrics.leaveBalances[bucket].used += days;
                }
            }

            await prisma.employeeProfile.update({
                where: { id: emp.id },
                data: {
                    currentLeaveBalance: correctBalance,
                    leaveBalance: correctBalance,
                    metrics: metrics
                }
            });
        }

        console.log('\n✨ Emergency Cleanup Complete.');

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanup();
