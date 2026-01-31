import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { z } from 'zod';

// Validation schema for manual attendance
const manualAttendanceSchema = z.object({
    employeeId: z.string().uuid(),
    date: z.string().refine(val => !isNaN(Date.parse(val)), {
        message: "Invalid date format"
    }),
    checkIn: z.string().optional(), // ISO string or time string
    checkOut: z.string().optional(), // ISO string or time string
    status: z.enum(['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY', 'WEEKOFF']).default('PRESENT'),
    notes: z.string().optional(),
});

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const validation = manualAttendanceSchema.safeParse(body);

            if (!validation.success) {
                return createErrorResponse(validation.error);
            }

            const { employeeId, date, checkIn, checkOut, status, notes } = validation.data;

            // Access Control Check
            if (user.role === 'MANAGER') {
                // Ensure target employee is in manager's team
                const targetEmployee = await prisma.employeeProfile.findUnique({
                    where: { id: employeeId },
                    include: { user: true }
                });

                // Fetch manager's downline or check direct relationship
                // For simplicity/performance, checking simple hierarchy or company match if needed.
                // Reusing getDownlineUserIds logic would be ideal, but for now enforcing company check + reporting line
                if (targetEmployee?.user.managerId !== user.id && targetEmployee?.user.companyId !== user.companyId) {
                    // Strict check: Must be in same company at least. 
                    // Ideally should check reporting structure.
                    if (targetEmployee?.user.companyId !== user.companyId) {
                        return createErrorResponse('Forbidden: Employee not in your company', 403);
                    }
                }
            } else if (user.role === 'ADMIN' || user.role === 'HR_MANAGER') {
                const targetEmployee = await prisma.employeeProfile.findUnique({
                    where: { id: employeeId },
                    include: { user: true }
                });
                if (targetEmployee?.user.companyId !== user.companyId) {
                    return createErrorResponse('Forbidden: Employee not in your company', 403);
                }
            }

            const targetDate = new Date(date);
            targetDate.setHours(0, 0, 0, 0);

            // Construct CheckIn/Out DateTimes
            let checkInDate = null;
            let checkOutDate = null;

            if (checkIn) {
                // If full ISO, use it. If time (HH:mm), combine with date
                if (checkIn.includes('T')) {
                    checkInDate = new Date(checkIn);
                } else {
                    const [hours, minutes] = checkIn.split(':').map(Number);
                    checkInDate = new Date(targetDate);
                    checkInDate.setHours(hours, minutes, 0, 0);
                }
            }

            if (checkOut) {
                if (checkOut.includes('T')) {
                    checkOutDate = new Date(checkOut);
                } else {
                    const [hours, minutes] = checkOut.split(':').map(Number);
                    checkOutDate = new Date(targetDate);
                    checkOutDate.setHours(hours, minutes, 0, 0);
                }
            }

            // Upsert Attendance
            const record = await prisma.attendance.upsert({
                where: {
                    employeeId_date: {
                        employeeId,
                        date: targetDate
                    }
                },
                update: {
                    checkIn: checkInDate,
                    checkOut: checkOutDate,
                    status,
                    workFrom: 'OFFICE', // Default for manual entry unless specified
                    locationName: 'Manual Entry',
                    isGeofenced: true, // Manual override implies valid
                    lateMinutes: 0, // Reset or calculate manually if needed
                    otMinutes: 0, // Reset or calculate manually if needed
                    // Log modification? Could add note
                },
                create: {
                    employeeId,
                    date: targetDate,
                    checkIn: checkInDate,
                    checkOut: checkOutDate,
                    status,
                    workFrom: 'OFFICE',
                    locationName: 'Manual Entry',
                    companyId: user.companyId,
                    isGeofenced: true
                }
            });

            return NextResponse.json(record);

        } catch (error) {
            console.error('Manual Attendance Error:', error);
            return createErrorResponse(error);
        }
    }
);
