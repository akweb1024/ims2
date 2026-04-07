import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';

// HR / Super Admin: list all reimbursement records with filters
export const GET = authorizedRoute(['SUPER_ADMIN', 'HR', 'HR_MANAGER'], async (req: NextRequest) => {
    try {
        const url = new URL(req.url);
        const name = url.searchParams.get('name') || '';
        const employeeId = url.searchParams.get('employeeId') || '';
        const month = url.searchParams.get('month');
        const year = url.searchParams.get('year');

        const records = await prisma.reimbursementRecord.findMany({
            where: {
                ...(month ? { month: parseInt(month) } : {}),
                ...(year ? { year: parseInt(year) } : {}),
                user: {
                    ...(name ? { name: { contains: name, mode: 'insensitive' } } : {}),
                    employeeProfile: employeeId
                        ? { employeeId: { contains: employeeId, mode: 'insensitive' } }
                        : undefined,
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        employeeProfile: {
                            select: {
                                employeeId: true,
                                designation: true,
                            }
                        }
                    }
                }
            },
            orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
        });

        return NextResponse.json({ data: records });
    } catch (error: any) {
        console.error('HR Reimbursements GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
});
