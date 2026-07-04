import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { logger } from '@/lib/logger';

// DELETE /api/staff-management/punch/[id]
// Delete a punch (attendance) record
export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'],
    async (_req: NextRequest, user, props: { params: Promise<{ id: string }> }) => {
        try {
            const params = await props.params;

            const record = await prisma.attendance.findUnique({
                where: { id: params.id },
                select: { id: true, companyId: true }
            });

            if (!record) {
                return NextResponse.json({ error: 'Punch record not found' }, { status: 404 });
            }

            if (user.role !== 'SUPER_ADMIN' && record.companyId && record.companyId !== user.companyId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            await prisma.attendance.delete({ where: { id: params.id } });

            logger.info('Punch record deleted', { attendanceId: params.id, by: user.id });

            return NextResponse.json({ success: true });
        } catch (error) {
            logger.error('Error deleting punch record:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
);
