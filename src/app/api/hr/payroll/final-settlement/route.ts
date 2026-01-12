import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { PayrollCalculator } from '@/lib/payroll';

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { employeeId, lastWorkingDay, noticeServed, leaveEncashmentDays, bonus, gratuity, otherDues, deductions } = body;

            if (!employeeId || !lastWorkingDay) {
                return createErrorResponse('Employee ID and Last Working Day are required', 400);
            }

            const employee = await prisma.employeeProfile.findUnique({
                where: { id: employeeId },
                include: { user: true }
            });

            if (!employee) return createErrorResponse('Employee not found', 404);

            const lwd = new Date(lastWorkingDay);
            const daysInMonth = new Date(lwd.getFullYear(), lwd.getMonth() + 1, 0).getDate();
            const workedDays = lwd.getDate();

            // 1. Calculate Pro-rata Salary for the last month
            const config = await PayrollCalculator.getStatutoryConfig(user.companyId!);

            const baseSalary = employee.baseSalary || 0;

            // Assume 0 LWP for FF calculation unless specified
            const breakdown = PayrollCalculator.calculate({
                basicSalary: baseSalary * 0.5, // 50% Basic
                hra: baseSalary * 0.25,
                conveyance: 1600,
                medical: 1250,
                specialAllowance: (baseSalary * 0.25) - 2850,
                otherAllowances: 0,
                lwpDays: daysInMonth - workedDays, // Deduction for days not worked in final month
                daysInMonth: daysInMonth
            }, config);

            // 2. Additionals
            const totalArrears = (bonus || 0) + (gratuity || 0) + (otherDues || 0) + (leaveEncashmentDays * (baseSalary / 30));
            const totalDeductions = deductions || 0;

            const finalNet = breakdown.netPayable + totalArrears - totalDeductions;

            // 3. Create Final Salary Slip
            const slip = await prisma.salarySlip.create({
                data: {
                    employeeId,
                    companyId: user.companyId,
                    month: lwd.getMonth() + 1,
                    year: lwd.getFullYear(),
                    amountPaid: finalNet,
                    status: 'GENERATED',
                    isFinalSettlement: true,
                    notes: `F&F Settlement. LWD: ${lastWorkingDay}. Notice Served: ${noticeServed ? 'YES' : 'NO'}`,
                    basicSalary: breakdown.earnings.basic,
                    hra: breakdown.earnings.hra,
                    grossSalary: breakdown.earnings.gross,
                    arrears: totalArrears,
                    totalDeductions: breakdown.deductions.total + totalDeductions,
                }
            });

            // 4. Deactivate User
            await prisma.user.update({
                where: { id: employee.userId },
                data: { isActive: false }
            });

            return NextResponse.json({
                message: 'F&F Settlement generated successfully',
                slip,
                breakdown: {
                    salary: breakdown.netPayable,
                    arrears: totalArrears,
                    deductions: totalDeductions,
                    finalNet
                }
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
