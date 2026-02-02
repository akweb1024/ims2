import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { logger } from '@/lib/logger';

// POST /api/staff-management/attendance/manual
// Create or update a manual attendance record
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { employeeId, date, checkIn, checkOut, status, remarks, workMode, shift } = body;

            if (!employeeId || !date) {
                return NextResponse.json(
                    { error: 'Employee and Date are required' },
                    { status: 400 }
                );
            }

            // Parse DateTimes
            // Input 'date' is YYYY-MM-DD string
            // Input 'checkIn/checkOut' are HH:mm strings

            const recordDate = new Date(date);
            let checkInTime = null;
            let checkOutTime = null;

            if (checkIn) {
                checkInTime = new Date(`${date}T${checkIn}:00`);
            }
            if (checkOut) {
                checkOutTime = new Date(`${date}T${checkOut}:00`);
            }

            // Validate CheckIn < CheckOut
            if (checkInTime && checkOutTime && checkInTime >= checkOutTime) {
                return NextResponse.json(
                    { error: 'Check-out time must be after Check-in time' },
                    { status: 400 }
                );
            }

            // Calculate working hours
            let workingHours = 0;
            if (checkInTime && checkOutTime) {
                const diffMs = checkOutTime.getTime() - checkInTime.getTime();
                workingHours = diffMs / (1000 * 60 * 60);
            }

            // Determine if Late (Mock logic: assumes 9:30 AM start)
            // Ideally should fetch shift details
            let isLate = false;
            let lateMinutes = 0;
            if (checkInTime) {
                const shiftStart = new Date(`${date}T09:30:00`); // Hardcoded standard start
                if (checkInTime > shiftStart) {
                    isLate = true;
                    lateMinutes = Math.floor((checkInTime.getTime() - shiftStart.getTime()) / 60000);
                }
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

            const targetProfileId = profile.id;

            // Upsert Attendance Record
            const attendance = await prisma.attendance.upsert({
                where: {
                    employeeId_date: {
                        employeeId: targetProfileId,
                        date: recordDate
                    }
                },
                update: {
                    checkIn: checkInTime,
                    checkOut: checkOutTime,
                    status: (status || 'PRESENT') as any,
                    remarks: remarks,
                    workFrom: (workMode || 'OFFICE') as any,
                    lateMinutes: lateMinutes,
                    companyId: user.companyId
                } as any,
                create: {
                    employeeId: targetProfileId,
                    date: recordDate,
                    checkIn: checkInTime,
                    checkOut: checkOutTime,
                    status: (status || 'PRESENT') as any,
                    remarks: remarks,
                    workFrom: (workMode || 'OFFICE') as any,
                    lateMinutes: lateMinutes,
                    companyId: user.companyId
                } as any
            });

            logger.info('Manual attendance record updated/created', {
                attendanceId: attendance.id,
                employeeId: targetProfileId,
                date
            });

            return NextResponse.json(attendance);

        } catch (error) {
            logger.error('Error creating manual attendance:', error);
            return NextResponse.json(
                { error: 'Internal Server Error' },
                { status: 500 }
            );
        }
    }
);
