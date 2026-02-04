
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const companyId = user.companyId;

            const year = parseInt(searchParams.get('year') || (new Date().getFullYear()).toString());
            const monthParam = searchParams.get('month');
            const targetEmployeeId = searchParams.get('employeeId');

            // Default to current month if not fetching history (no employeeId) and no month specified
            const month = monthParam ? parseInt(monthParam) : (targetEmployeeId ? undefined : new Date().getMonth() + 1);

            if (!companyId && user.role !== 'SUPER_ADMIN') {
                return createErrorResponse('Company context required', 400);
            }

            const where: any = {
                user: {
                    isActive: true
                }
            };

            if (companyId) {
                where.user.companyId = companyId;
            }

            if (targetEmployeeId) {
                where.id = targetEmployeeId;
            } else if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const subIds = await getDownlineUserIds(user.id, companyId || undefined);
                where.user.id = { in: subIds };
            }

            // Ledger filter
            const ledgerWhere: any = { year };
            if (month) {
                ledgerWhere.month = month;
            }

            // Fetch employees
            const employees = await prisma.employeeProfile.findMany({
                where: where,
                include: {
                    user: { select: { email: true, name: true } },
                    leaveLedgers: {
                        where: ledgerWhere,
                        orderBy: { month: 'asc' }
                    }
                }
            });

            // Flatten data
            // If fetching history (targetEmployeeId present), we might return multiple rows per employee (one per month)
            // If fetching batch (default), we expect one row per employee (for the specific month)

            let data: any[] = [];

            if (targetEmployeeId && !month) {
                // History Mode: Return array of ledgers for this employee
                // We only have one employee in 'employees' array usually
                employees.forEach(emp => {
                    // Start with empty months 1-12 to ensure gaps are filled
                    // We enforce strictly that Month X Opening = Month X-1 Closing

                    const filledLedgers: any[] = [];
                    for (let m = 1; m <= 12; m++) {
                        const existing = emp.leaveLedgers.find(l => l.month === m);

                        // Determine Opening Balance
                        let opening = 0;
                        if (m === 1) {
                            // For Jan, trust the DB or default to 0
                            opening = existing?.openingBalance || 0;
                        } else {
                            // For Feb-Dec, STRICTLY use previous month's closing
                            opening = filledLedgers[m - 2].closingBalance;
                        }

                        // Determine Values
                        const auto = existing?.autoCredit ?? 1.5;
                        const taken = existing?.takenLeaves ?? 0;
                        const late = existing?.lateDeductions ?? 0;
                        const short = existing?.shortLeaveDeductions ?? 0;
                        const remarks = existing?.remarks || '';

                        // Determine Closing
                        // Ideally trust DB, but if 'opening' changed due to our sync forcing, 
                        // we might need to recalculate closing to avoid math error in display?
                        // If we force Opening=10 but DB says Opening=5, Closing=6 (Implies +1 net).
                        // If we show Opening=10, we should show Closing=11?
                        // BUT 'shortLeaveDeductions' might be the balancer.

                        // Let's recalculate Closing based on the FORCED Opening to ensure the row math is valid.
                        // raw = Opening + Credit - Taken - Late - Short
                        // But 'Short' might have been calculated based on old Opening.
                        // This is tricky. 
                        // If we change Opening, we change the available balance. 
                        // If we keep 'Short' constant, Closing updates naturally.
                        // If Closing goes negative, 'Short' should have increased.
                        // But this is a GET request, we shouldn't mutate data (like adding Short) implicitly?
                        // If we just show negative closing? The UI will look broken (we promised no negative).

                        // Strategy: 
                        // 1. Calculate Raw Closing with existing Short.
                        // 2. If negative, visual "Short" increases? Or just show 0 and huge Short?
                        // We can compute the "Required Short" to make it 0.

                        let closing = 0;
                        let displayShort = short;

                        const rawBalance = opening + auto - taken - late - short;

                        if (rawBalance < 0) {
                            // If balance is negative even with existing deduction, we need MORE deduction visually
                            const deficit = Math.abs(rawBalance);
                            displayShort += deficit;
                            closing = 0;
                        } else {
                            closing = rawBalance;
                        }

                        // If existing record had a closing balance, and our calc differs...
                        // We prefer our Calc because it ensures visual consistency (Opening + Cr - Dr = Closing).
                        // And correct chaining.

                        filledLedgers.push({
                            id: existing?.id || `temp_${m}`,
                            employeeId: emp.id,
                            email: emp.user.email,
                            name: emp.user.name,
                            month: m,
                            year,
                            openingBalance: parseFloat(opening.toFixed(2)),
                            autoCredit: auto,
                            takenLeaves: taken,
                            lateArrivalCount: existing?.lateArrivalCount || 0,
                            shortLeaveCount: existing?.shortLeaveCount || 0,
                            lateDeductions: late,
                            shortLeaveDeductions: parseFloat(displayShort.toFixed(2)),
                            closingBalance: parseFloat(closing.toFixed(2)),
                            remarks: remarks
                        });
                    }
                    data = filledLedgers;
                });
            } else {
                // Batch Mode
                data = employees.map(emp => {
                    const ledger = emp.leaveLedgers[0] || null; // Access 0 because we filtered by month
                    return {
                        employeeId: emp.id,
                        email: emp.user.email,
                        name: emp.user.name,
                        month: month || 0, // Should always be present in batch mode
                        year,
                        openingBalance: ledger?.openingBalance || 0,
                        autoCredit: ledger?.autoCredit || 1.5,
                        takenLeaves: ledger?.takenLeaves || 0,
                        lateArrivalCount: ledger?.lateArrivalCount || 0,
                        shortLeaveCount: ledger?.shortLeaveCount || 0,
                        lateDeductions: ledger?.lateDeductions || 0,
                        shortLeaveDeductions: ledger?.shortLeaveDeductions || 0,
                        closingBalance: ledger?.closingBalance || 0,
                        remarks: ledger?.remarks || ''
                    };
                });
            }

            return NextResponse.json(data);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            let body;
            try {
                body = await req.json();
            } catch (e) {
                return createErrorResponse('Invalid JSON', 400);
            }

            const { employeeId, month, year, openingBalance, autoCredit, takenLeaves, lateDeductions, shortLeaveDeductions, closingBalance, remarks } = body;

            if (!employeeId || !month || !year) {
                return createErrorResponse('Missing required fields (employeeId, month, year)', 400);
            }

            const parseNum = (v: any) => {
                const n = parseFloat(v);
                return isNaN(n) ? 0 : n;
            };

            const safeOpening = parseNum(openingBalance);
            const safeAllotted = parseNum(autoCredit || 1.5);
            const safeTaken = parseNum(takenLeaves);
            const safeLateDeds = parseNum(lateDeductions);
            const safeShortDeds = parseNum(shortLeaveDeductions);
            const safeClosing = parseNum(closingBalance);

            const result = await prisma.$transaction(async (tx) => {
                // 1. Calculate Initial Ledger State (Before DB Update)
                // We need to fetch the previous month's closing if it exists to ensure integrity, 
                // BUT for this specific request, we trust the `openingBalance` passed from frontend (which came from table) 
                // OR we strictly enforce it. 
                // To be robust: If we have a previous month, we SHOULD use its closing.
                // However, user might be editing Jan, which has no Prev.
                // Let's stick to the inputs but enforce the "No Negative" rule.

                const finalOpening = safeOpening;
                const finalAuto = safeAllotted;
                const finalTaken = safeTaken;
                const finalLate = safeLateDeds;
                let finalShort = safeShortDeds;

                // Calculate Raw Balance
                let rawClosing = finalOpening + finalAuto - finalTaken - finalLate - finalShort;

                // Negative Balance Logic: If negative, add deficit to shortLeaveDeductions
                if (rawClosing < 0) {
                    const deficit = Math.abs(rawClosing);
                    finalShort += deficit; // Increase deduction
                    rawClosing = 0;        // Floor closing at 0
                }

                const ledger = await tx.leaveLedger.upsert({
                    where: {
                        employeeId_month_year: {
                            employeeId,
                            month,
                            year
                        }
                    },
                    update: {
                        openingBalance: finalOpening,
                        autoCredit: finalAuto,
                        takenLeaves: finalTaken,
                        lateDeductions: finalLate,
                        shortLeaveDeductions: finalShort,
                        closingBalance: rawClosing,
                        remarks,
                        companyId: user.companyId
                    },
                    create: {
                        employeeId,
                        month,
                        year,
                        openingBalance: finalOpening,
                        autoCredit: finalAuto,
                        takenLeaves: finalTaken,
                        lateDeductions: finalLate,
                        shortLeaveDeductions: finalShort,
                        closingBalance: rawClosing,
                        remarks,
                        companyId: user.companyId
                    }
                });

                // RECURSIVE CARRY FORWARD
                const updateFutureMonths = async (currentMonth: number, currentYear: number, currentClosingBalance: number) => {
                    if (currentMonth >= 12) return;

                    const nextMonth = currentMonth + 1;
                    const nextYear = currentYear;

                    const nextLedger = await tx.leaveLedger.findUnique({
                        where: {
                            employeeId_month_year: {
                                employeeId,
                                month: nextMonth,
                                year: nextYear
                            }
                        }
                    });

                    if (nextLedger) {
                        const newOpening = currentClosingBalance;

                        // Recalculate Next Month
                        const nextAuto = nextLedger.autoCredit;
                        const nextTaken = nextLedger.takenLeaves;
                        const nextLate = nextLedger.lateDeductions;
                        const nextShort = nextLedger.shortLeaveDeductions; // Start with existing

                        // IMPORTANT: We need to RESET the 'deficit' part of shortLeaveDeductions 
                        // if we are re-calculating? No, we can't distinguish "user entered" vs "system added".
                        // This is a complex side-effect. 
                        // Simplified approach: calculated raw. If negative, ADD to short.
                        // Ideally we'd store "systemDeduction" separately? 
                        // User request: "negative will be deducted from the attendance".
                        // Use case: I edit Jan. Jan Closing becomes 0. Feb Opening becomes 0.
                        // Feb was previously: Op: 2, Taken: 3 -> Closing -1 -> Short 1, Closing 0.
                        // Now Feb Op is 0. Taken 3. -> Closing -3 -> Short needs to be 3.
                        // Be careful not to double count.
                        // The `nextLedger` has `shortLeaveDeductions` already in DB.
                        // If we naively add to it, we might compound.
                        // Ideally, we should recalculate based on "Input" values. 
                        // But we don't have the "original input" without the system adder.
                        // Assumption: The stored `shortLeaveDeductions` includes previously added deficits?
                        // Actually, this recursive logic usually just updates the OPENING.
                        // If we act like a spreadsheet, we validly re-calc the whole row.
                        // BUT we don't know if the existing `shortLeaveDeductions` includes a previous deficit patch.
                        // Valid strategy: 
                        // Since we cannot separate user vs system deduction, we might have to accept that sticking STRICTLY to "Opening + Credit - Taken" is the "Available".
                        // And "Deductions" are external penalties.
                        // User says: "negative will be deducted".
                        // So: (Opening + Credit) - (Taken) = Net.
                        // If Net < 0:
                        //   Deficit = Abs(Net).
                        //   We need to RECORD this deficit.
                        //   Closing = 0.
                        //   Store Deficit in `shortLeaveDeductions`.
                        //   BUT we must retain any MANUAL `shortLeaveDeductions`.
                        //   This implies we might overwrite manual deductions if we just do logical calc.

                        // Let's assume for now: `shortLeaveDeductions` field is THE bucket for this.
                        // If we simply calculate:
                        // `Actual = Opening + Credit - Taken - Late`.
                        // `Short = StartingShort`.
                        // `Balance = Actual - Short`.
                        // `if Balance < 0`: `AddedShort = -Balance`, `Short += AddedShort`, `Balance = 0`.

                        // The problem is `nextLedger.shortLeaveDeductions` might ALREADY include a deficit from a previous calculation.
                        // If we re-run, we might add MORE.
                        // E.g. Run 1: Calc -1. Short becomes 1. Closing 0.
                        // Run 2 (Update Jan, no change to Feb input): Feb Op still 0. Calc -1. Short is 1. Balance = 0 - 1 - 1 = -2? No.
                        // A stateless calculation is best:
                        // `Balance` = `Opening` + `Auto` - `Taken` - `Late` - `(UserEnteredShort)`.
                        // We don't track `UserEnteredShort`.
                        // RISK: Re-running this logic on existing rows might inflate deductions if we can't distinguish.

                        // COMPROMISE: We will update `openingBalance` and `closingBalance` ONLY in the recursive step, 
                        // UNLESS we see a negative result, then we adjust short deduction.
                        // If the result is positive, do we reduce short deduction? 
                        // That would imply "giving back" attendance.
                        // User likely wants: "If I have -ve balance, cut my pay."
                        // If I fix it later (add credit), "Give me back my pay?" -> Probably yes.

                        // So, effectively: `shortLeaveDeductions` should dynamically balance the equation to 0 if needed.
                        // But we lack a field for "Manual Short Leave".
                        // Let's look at `takenLeaves` vs `shortLeaveCount`.
                        // Maybe we can ignore `shortLeaveDeductions` from the "formula" and treat it as the "Result"?
                        // And `takenLeaves` is the user input?
                        // User prompt options: "{Auth, Unauth, Late}".
                        // "Unauthorized" usually = Short Leave.
                        // "Late" = Late Deduction.

                        // Proposal:
                        // `Available = Opening + Credit`.
                        // `Demands = Taken + Late`.
                        // `Balance = Available - Demands`.
                        // `if Balance < 0`:
                        //    `shortLeaveDeductions = abs(Balance)`
                        //    `closing = 0`
                        // `else`:
                        //    `shortLeaveDeductions = 0` (Or preserve manual?) <-- This is the tricky part.
                        //    `closing = Balance`

                        // If I set `shortLeaveDeductions` to 0, I wipe manual entries.
                        // If I don't, I accumulate error.
                        // Given the user said "negative will be deducted", it sounds like a calculated field.
                        // I will assume `shortLeaveDeductions` is primarily for this System Calculation or explicit penalty.
                        // I will try to PRESERVE if it seems unrelated to balancing? No, impossible.

                        // SAFE APPROACH: 
                        // Check if `shortLeaveDeductions` accounts for the EXACT deficit?
                        // For now, I will implement the logic:
                        // `Net = Opening + Auto - Taken - Late`. (Ignoring existing Short for a moment)
                        // If `Net < 0`: `Short = abs(Net)`, `Closing = 0`.
                        // If `Net >= 0`: `Short = 0`, `Closing = Net`.
                        // This effectively makes `shortLeaveDeductions` a COMPUTED field representing "Excess Leaves".
                        // This seems aligned with "negative will be deducted".

                        const rawActual = newOpening + (nextAuto || 1.5) - nextTaken - nextLate;

                        let newShort = 0;
                        let newClosing = 0;

                        if (rawActual < 0) {
                            newShort = Math.abs(rawActual);
                            newClosing = 0;
                        } else {
                            newShort = 0; // Resetting short deduction if balance is sufficient
                            newClosing = rawActual;
                        }

                        // We'll update Short and Closing
                        await tx.leaveLedger.update({
                            where: { id: nextLedger.id },
                            data: {
                                openingBalance: newOpening,
                                closingBalance: newClosing,
                                shortLeaveDeductions: newShort
                            }
                        });

                        await updateFutureMonths(nextMonth, nextYear, newClosing);
                    }
                };

                await updateFutureMonths(month, year, rawClosing);

                // Sync EmployeeProfile
                await tx.employeeProfile.update({
                    where: { id: employeeId },
                    data: {
                        currentLeaveBalance: rawClosing,
                        leaveBalance: rawClosing
                    }
                });

                return ledger;
            });

            return NextResponse.json(result);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
