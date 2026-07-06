import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { upsertAttendanceRecord } from '@/lib/services/attendance-service';
import { logger } from '@/lib/logger';

// POST /api/hr/punch/manual
// Add a manual punch entry (maps to an Attendance check-in/check-out)
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { employeeId, date, punchIn, punchOut, punchInLocation, punchOutLocation } = body;

            if (!employeeId || !date) {
                return NextResponse.json(
                    { error: 'Employee and Date are required' },
                    { status: 400 }
                );
            }

            const recordDate = new Date(date);
            const checkInTime = punchIn ? new Date(`${date}T${punchIn}:00`) : undefined;
            const checkOutTime = punchOut ? new Date(`${date}T${punchOut}:00`) : undefined;

            if (checkInTime && checkOutTime && checkInTime >= checkOutTime) {
                return NextResponse.json(
                    { error: 'Punch-out time must be after Punch-in time' },
                    { status: 400 }
                );
            }

            // Standardize employeeId (could be User ID or Profile ID)
            const profile = await prisma.employeeProfile.findFirst({
                where: {
                    OR: [
                        { id: employeeId },
                        { userId: employeeId }
                    ]
                },
                select: { id: true }
            });

            if (!profile) {
                return NextResponse.json(
                    { error: 'Employee profile not found' },
                    { status: 404 }
                );
            }

            const locationName = [punchInLocation, punchOutLocation]
                .filter(Boolean)
                .join(' → ') || undefined;

            const attendance = await upsertAttendanceRecord({
                employeeId: profile.id,
                companyId: user.companyId!,
                date: recordDate,
                checkIn: checkInTime,
                checkOut: checkOutTime,
                locationName,
                isManual: true
            });

            logger.info('Manual punch entry created/updated', {
                attendanceId: attendance.id,
                employeeId: profile.id,
                date
            });

            return NextResponse.json(attendance);
        } catch (error) {
            logger.error('Error creating manual punch entry:', error);
            return NextResponse.json(
                { error: 'Internal Server Error' },
                { status: 500 }
            );
        }
    }
);
