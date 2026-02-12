import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { logger } from '@/lib/logger';

// POST /api/staff-management/salary/generate
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { month, companyId, departmentId } = body; // month is "YYYY-MM"

            if (!month) {
                return NextResponse.json({ error: 'Month is required' }, { status: 400 });
            }

            const [yearStr, monthStr] = month.split('-');
            const year = parseInt(yearStr);
            const monthInt = parseInt(monthStr);

            const startDate = new Date(year, monthInt - 1, 1);
            const endDate = new Date(year, monthInt, 0); // Last day of month
            const totalDaysInMonth = endDate.getDate();

            // 1. Fetch Eligible Employees
            const where: any = {
                isActive: true,
                ...(companyId && companyId !== 'all' ? { companyId } : {}),
                ...(departmentId && departmentId !== 'all' ? { departmentId } : {})
            };

            // If user is not super_admin, force companyId
            if (user.companyId && user.role !== 'SUPER_ADMIN') {
                where.companyId = user.companyId;
            }

            const employees = await prisma.employeeProfile.findMany({
                where,
                include: {
                    salaryStructure: true,
                    user: { select: { email: true, name: true } }
                }
            });

            let generatedCount = 0;
            const results = [];

            for (const emp of employees) {
                // Skip if no salary structure
                if (!emp.salaryStructure) {
                    results.push({ employee: emp.user.name, status: 'Skipped - No Structure' });
                    continue;
                }

                const structure = emp.salaryStructure;

                // 2. Calculate LWP (Loss of Pay)
                // A. Absent days from Attendance
                const absentCount = await prisma.attendance.count({
                    where: {
                        employeeId: emp.id,
                        date: { gte: startDate, lte: endDate },
                        status: { in: ['ABSENT', 'LWP'] }
                    }
                });

                // B. Approved LWP Leaves (that might not be in attendance yet if future dated? usually syncs)
                // For safety, rely on Attendance as source of truth for past dates.
                // But for "Payroll Generation" usually done at end of month.
                // Let's rely on Absent Count + explicit LWP leaves that cover days NOT in attendance (too complex for MVP).
                // MVP: LWP = Absent Count.

                // 3. Calculate Payable Days
                // If structure.wageType === 'DAILY', pay per day.
                // Assuming 'MONTHLY' fixed salary breakdown.

                const lwpDays = absentCount;
                const payableDays = Math.max(0, totalDaysInMonth - lwpDays);
                const salaryFactor = payableDays / totalDaysInMonth;

                // 4. Calculate Component Values
                // Pro-rate earnings
                const basicSalary = Number((structure.basicSalary * salaryFactor).toFixed(2));
                const hra = Number((structure.hra * salaryFactor).toFixed(2));
                const conveyance = Number((structure.conveyance * salaryFactor).toFixed(2));
                const medical = Number((structure.medical * salaryFactor).toFixed(2));
                const specialAllowance = Number((structure.specialAllowance * salaryFactor).toFixed(2));

                const grossEarning = basicSalary + hra + conveyance + medical + specialAllowance;

                // Deductions (Fixed unless rules applied)
                // PF/ESIC usually on earned basic? strict rules apply. 
                // MVP: Pro-rate standard deductions or keep fixed?
                // Usually PF is 12% of Earned Basic.

                const pfEmployee = Number((basicSalary * 0.12).toFixed(2)); // Mock rule
                const esicEmployee = Number((grossEarning * 0.0075).toFixed(2)); // Mock rule (0.75%)
                const pt = structure.professionalTax; // Fixed usually
                const tds = structure.tds; // Fixed

                // advanceDeduction is not in SalaryStructure, remove it or use 0
                const advanceDeduction = 0;

                const totalDeductions = Number((pfEmployee + esicEmployee + pt + tds + advanceDeduction).toFixed(2));
                const netSalary = Number((grossEarning - totalDeductions).toFixed(2));

                // 5. Create Salary Slip
                await prisma.salarySlip.create({
                    data: {
                        employeeId: emp.id,
                        companyId: (emp as any).companyId, // Cast to any to resolve TS error
                        month: monthInt,
                        year: year,
                        basicSalary,
                        hra,
                        conveyance,
                        medical,
                        specialAllowance,
                        grossSalary: grossEarning,

                        pfEmployee,
                        esicEmployee,
                        professionalTax: pt,
                        tds,
                        totalDeductions,

                        netPayable: netSalary,
                        amountPaid: 0, // Not paid yet
                        status: 'GENERATED',

                        // Copy employer parts for record
                        pfEmployer: structure.pfEmployer,
                        esicEmployer: structure.esicEmployer,

                        ctc: structure.salaryFixed // Use salaryFixed as base reference if ctc missing, or 0
                    }
                });

                generatedCount++;
                results.push({ employee: emp.user.name, status: 'Generated', netSalary });
            }

            return NextResponse.json({
                message: `Salary generation complete. ${generatedCount} slips generated.`,
                details: results
            });

        } catch (error) {
            logger.error('Error generating salary:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
);
