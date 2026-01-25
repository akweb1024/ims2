import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { calculateLeaveBalance } from '@/lib/utils/leave-calculator';

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { rows, month, year } = body;

            if (!rows || !Array.isArray(rows)) {
                return createErrorResponse('Invalid import data: expected array of rows', 400);
            }

            const results = {
                updated: 0,
                created: 0,
                skipped: 0,
                errors: [] as string[]
            };

            for (const row of rows) {
                try {
                    // Expecting standard columns: Employee ID, Email, Name, Month, Year, Opening, Allotted, Taken, Delay Deds, Closing
                    // But we only strictly need Employee ID and the balances
                    const employeeId = row['Employee ID'] || row['id'];
                    const openingBalance = parseFloat(row['Last Bal Leave'] || row['Opening Balance'] || 0);
                    const autoCredit = parseFloat(row['Leave Allotted'] || row['Auto Credit'] || 0);
                    const takenLeaves = parseFloat(row['Leave Taken'] || row['Taken Leaves'] || 0);
                    const lateDeductions = parseFloat(row['Delay Deductions'] || row['Late Deductions'] || 0);

                    if (!employeeId) {
                        results.skipped++;
                        continue;
                    }

                    const { displayBalance } = calculateLeaveBalance(
                        openingBalance,
                        autoCredit,
                        takenLeaves,
                        lateDeductions,
                        0 // shortLeaveDeductions (assuming combined or handled via lateDeds in the CSV)
                    );

                    const ledger = await prisma.leaveLedger.upsert({
                        where: {
                            employeeId_month_year: {
                                employeeId,
                                month: parseInt(row['Month'] || month),
                                year: parseInt(row['Year'] || year)
                            }
                        },
                        update: {
                            openingBalance,
                            autoCredit,
                            takenLeaves,
                            lateDeductions,
                            closingBalance: displayBalance,
                            remarks: 'Imported via bulk update'
                        },
                        create: {
                            employeeId,
                            month: parseInt(row['Month'] || month),
                            year: parseInt(row['Year'] || year),
                            openingBalance,
                            autoCredit,
                            takenLeaves,
                            lateDeductions,
                            closingBalance: displayBalance,
                            companyId: user.companyId,
                            remarks: 'Imported via bulk update'
                        }
                    });

                    // Sync with profile
                    await prisma.employeeProfile.update({
                        where: { id: employeeId },
                        data: {
                            currentLeaveBalance: displayBalance,
                            leaveBalance: displayBalance
                        }
                    });

                    results.updated++;
                } catch (err: any) {
                    results.errors.push(`Error in row for ${row['Email'] || 'Unknown'}: ${err.message}`);
                }
            }

            return NextResponse.json({
                success: true,
                ...results
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
