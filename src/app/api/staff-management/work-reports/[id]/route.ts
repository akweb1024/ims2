import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { logger } from '@/lib/logger';

const ALLOWED_STATUSES = ['APPROVED', 'REJECTED'];

// PATCH /api/staff-management/work-reports/[id]
// Approve or reject a work report, optionally with a manager comment
export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER', 'HR'],
    async (req: NextRequest, user, props: { params: Promise<{ id: string }> }) => {
        try {
            const params = await props.params;
            const { status, managerComment } = await req.json();

            if (!status || !ALLOWED_STATUSES.includes(status)) {
                return NextResponse.json(
                    { error: `Status must be one of: ${ALLOWED_STATUSES.join(', ')}` },
                    { status: 400 }
                );
            }

            const report = await prisma.workReport.findUnique({
                where: { id: params.id },
                select: {
                    id: true,
                    companyId: true,
                    employee: { select: { user: { select: { companyId: true } } } }
                }
            });

            if (!report) {
                return NextResponse.json({ error: 'Work report not found' }, { status: 404 });
            }

            const reportCompanyId = report.companyId ?? report.employee?.user?.companyId;
            if (user.role !== 'SUPER_ADMIN' && reportCompanyId && reportCompanyId !== user.companyId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            const updated = await prisma.workReport.update({
                where: { id: params.id },
                data: {
                    status,
                    managerComment: managerComment ?? undefined
                }
            });

            logger.info('Work report reviewed', {
                workReportId: params.id,
                status,
                by: user.id
            });

            return NextResponse.json(updated);
        } catch (error) {
            logger.error('Error updating work report:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
);
