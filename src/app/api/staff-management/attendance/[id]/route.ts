import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { logger } from '@/lib/logger';

const ALLOWED_STATUSES = ['PRESENT', 'ABSENT', 'ON_LEAVE', 'HALF_DAY'];

// PATCH /api/staff-management/attendance/[id]
// Update the status of an attendance record
export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'],
    async (req: NextRequest, user, props: { params: Promise<{ id: string }> }) => {
        try {
            const params = await props.params;
            const { status } = await req.json();

            if (!status || !ALLOWED_STATUSES.includes(status)) {
                return NextResponse.json(
                    { error: `Status must be one of: ${ALLOWED_STATUSES.join(', ')}` },
                    { status: 400 }
                );
            }

            const record = await prisma.attendance.findUnique({
                where: { id: params.id },
                select: { id: true, companyId: true }
            });

            if (!record) {
                return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
            }

            if (user.role !== 'SUPER_ADMIN' && record.companyId && record.companyId !== user.companyId) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            const updated = await prisma.attendance.update({
                where: { id: params.id },
                data: { status }
            });

            logger.info('Attendance status updated', {
                attendanceId: params.id,
                status,
                by: user.id
            });

            return NextResponse.json(updated);
        } catch (error) {
            logger.error('Error updating attendance status:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
);
