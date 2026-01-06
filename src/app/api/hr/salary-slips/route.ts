import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const employeeId = searchParams.get('employeeId');
        const showAll = searchParams.get('all') === 'true';

        const where: any = {};

        if (employeeId) {
            if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            where.employeeId = employeeId;
            // Also ensure the employee belongs to the company context
            if (user.companyId) {
                where.employee = { user: { companyId: user.companyId } };
            }
        } else if (showAll && ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
            if (user.companyId) {
                where.employee = { user: { companyId: user.companyId } };
            }
        } else {
            const profile = await prisma.employeeProfile.findUnique({
                where: { userId: user.id }
            });
            if (!profile) return NextResponse.json([]);
            where.employeeId = profile.id;
        }

        const slips = await prisma.salarySlip.findMany({
            where,
            include: {
                employee: {
                    include: { user: { select: { email: true } } }
                }
            },
            orderBy: [{ year: 'desc' }, { month: 'desc' }]
        });

        return NextResponse.json(slips);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Admin route for generating slips would normally be separate, but including here for MVP
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();

        // Handle Bulk Generation
        if (body.action === 'BULK_GENERATE') {
            const { month, year } = body;
            const employees = await prisma.employeeProfile.findMany({
                where: {
                    user: { isActive: true, companyId: user.companyId }
                }
            });

            let generatedCount = 0;

            for (const emp of employees) {
                if (!emp.baseSalary) continue;

                const existing = await prisma.salarySlip.findFirst({
                    where: {
                        employeeId: emp.id,
                        month: parseInt(month),
                        year: parseInt(year)
                    }
                });

                if (!existing) {
                    await prisma.salarySlip.create({
                        data: {
                            employeeId: emp.id,
                            month: parseInt(month),
                            year: parseInt(year),
                            amountPaid: emp.baseSalary,
                            status: 'GENERATED'
                        }
                    });
                    generatedCount++;
                }
            }

            return NextResponse.json({ message: `Generated ${generatedCount} salary slips`, count: generatedCount });
        }

        // Single Creation
        const { employeeId, month, year, amountPaid, status } = body;

        const slip = await prisma.salarySlip.create({
            data: {
                employeeId,
                month: parseInt(month),
                year: parseInt(year),
                amountPaid: parseFloat(amountPaid),
                status: status || 'GENERATED'
            }
        });

        return NextResponse.json(slip);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
