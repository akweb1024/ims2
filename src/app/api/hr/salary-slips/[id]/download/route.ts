import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { renderPayslipPdf } from '@/lib/services/payroll/renderPayslipPdf';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;

        const slip = (await prisma.salarySlip.findUnique({
            where: { id },
            include: {
                employee: {
                    include: {
                        user: {
                            include: {
                                company: true,
                            }
                        }
                    }
                }
            }
        })) as any;

        if (!slip) {
            return NextResponse.json({ error: 'Salary slip not found' }, { status: 404 });
        }

        // Authorization check
        if (user.role !== 'SUPER_ADMIN' && user.role !== 'FINANCE_ADMIN' && user.role !== 'ADMIN') {
            const employeeProfile = await prisma.employeeProfile.findUnique({
                where: { userId: user.id }
            });
            if (slip.employeeId !== employeeProfile?.id) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][slip.month - 1] || '';
        const pdfBuffer = renderPayslipPdf(slip as any);

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Salary_Slip_${monthName}_${slip.year}.pdf"`
            }
        });

    } catch (error: any) {
        console.error('PDF Generation Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
