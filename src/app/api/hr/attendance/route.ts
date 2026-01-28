import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { attendanceCorrectionSchema, selfServiceAttendanceSchema } from '@/lib/validators/hr';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { processLateArrival } from '@/lib/utils/leave-ledger-processor';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
            const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
            const showAll = searchParams.get('all') === 'true';

            const where: Prisma.AttendanceWhereInput = {
                date: {
                    gte: new Date(year, month - 1, 1),
                    lte: new Date(year, month, 0)
                }
            };



            // ...

            if (user.companyId) {
                where.companyId = user.companyId;
            }

            if (showAll && ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                // Admin/Managers see their company/team
                if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                    const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                    // Include self if needed? Usually "All" means Team + Me in dashboard context
                    const allowedIds = [...subIds, user.id];
                    where.employee = { userId: { in: allowedIds } };
                }
            } else {
                const profile = await prisma.employeeProfile.findUnique({
                    where: { userId: user.id }
                });
                if (!profile) return NextResponse.json([]);
                where.employeeId = profile.id;
            }

            const attendance = await prisma.attendance.findMany({
                where,
                include: {
                    employee: {
                        include: { user: { select: { name: true, email: true } } }
                    },
                    shift: true
                },
                orderBy: { date: 'desc' }
            });

            return NextResponse.json(attendance);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();

            const validation = selfServiceAttendanceSchema.safeParse(body);
            if (!validation.success) {
                return createErrorResponse(validation.error);
            }

            const { action, workFrom, latitude, longitude, locationName } = validation.data;

            let profile = await prisma.employeeProfile.findUnique({
                where: { userId: user.id }
            });

            if (!profile) {
                try {
                    profile = await prisma.employeeProfile.create({
                        data: { userId: user.id }
                    });
                } catch (e: any) {
                    if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
                        profile = await prisma.employeeProfile.findUnique({ where: { userId: user.id } });
                    } else {
                        throw e;
                    }
                }
            }

            if (!profile) return createErrorResponse('Failed to initialize employee profile', 500);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const existing = await prisma.attendance.findUnique({
                where: {
                    employeeId_date: {
                        employeeId: profile.id,
                        date: today
                    }
                }
            });

            if (action === 'check-in') {
                if (existing?.checkIn) return createErrorResponse('Already checked in today', 400);

                const isRemote = workFrom === 'REMOTE';
                const userLat = parseFloat(String(latitude));
                const userLon = parseFloat(String(longitude));
                let isGeofenced = false;

                if (user.companyId && !isRemote) {
                    const company = await prisma.company.findUnique({
                        where: { id: user.companyId },
                        select: { latitude: true, longitude: true }
                    });

                    if (company?.latitude && company?.longitude && !isNaN(userLat) && !isNaN(userLon)) {
                        const R = 6371e3;
                        const φ1 = (userLat * Math.PI) / 180;
                        const φ2 = (company.latitude * Math.PI) / 180;
                        const Δφ = ((company.latitude - userLat) * Math.PI) / 180;
                        const Δλ = ((company.longitude - userLon) * Math.PI) / 180;
                        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
                        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                        const distance = R * c;
                        isGeofenced = distance < 200;
                    }
                } else if (isRemote) {
                    isGeofenced = true;
                }

                // Find Shift Roster
                const roster = await prisma.shiftRoster.findUnique({
                    where: { employeeId_date: { employeeId: profile.id, date: today } },
                    include: { shift: true }
                });

                const now = new Date();
                let lateMinutes = 0;
                const shiftId = roster?.shiftId;

                if (roster?.shift) {
                    const shift = roster.shift;
                    const [sHrs, sMin] = shift.startTime.split(':').map(Number);
                    const shiftStart = new Date(today);
                    shiftStart.setHours(sHrs, sMin, 0, 0);

                    const graceLimit = new Date(shiftStart);
                    graceLimit.setMinutes(graceLimit.getMinutes() + (shift.gracePeriod || 0));

                    if (now > graceLimit) {
                        lateMinutes = Math.floor((now.getTime() - shiftStart.getTime()) / (1000 * 60));
                    }
                }

                const record = await prisma.attendance.upsert({
                    where: { employeeId_date: { employeeId: profile.id, date: today } },
                    update: {
                        checkIn: now,
                        workFrom: workFrom || 'OFFICE',
                        latitude: isNaN(userLat) ? null : userLat,
                        longitude: isNaN(userLon) ? null : userLon,
                        isGeofenced,
                        locationName: locationName || (isRemote ? 'Remote Location' : 'Office HQ'),
                        companyId: user.companyId,
                        shiftId,
                        lateMinutes
                    },
                    create: {
                        employeeId: profile.id,
                        date: today,
                        checkIn: now,
                        workFrom: workFrom || 'OFFICE',
                        status: 'PRESENT',
                        latitude: isNaN(userLat) ? null : userLat,
                        longitude: isNaN(userLon) ? null : userLon,
                        isGeofenced,
                        locationName: locationName || (isRemote ? 'Remote Location' : 'Office HQ'),
                        companyId: user.companyId,
                        shiftId,
                        lateMinutes
                    }
                });

                // Process late arrival for leave deduction (if applicable)
                if (lateMinutes >= 31) {
                    await processLateArrival(profile.id, lateMinutes, user.companyId);
                }

                return NextResponse.json(record);
            } else if (action === 'check-out') {
                if (!existing?.checkIn) return createErrorResponse('Must check in first', 400);
                if (existing.checkOut) return createErrorResponse('Already checked out today', 400);

                const now = new Date();
                let otMinutes = 0;

                const attendanceWithShift = await prisma.attendance.findUnique({
                    where: { id: existing.id },
                    include: { shift: true }
                });

                if (attendanceWithShift?.shift) {
                    const shift = attendanceWithShift.shift;
                    const [eHrs, eMin] = shift.endTime.split(':').map(Number);
                    const shiftEnd = new Date(existing.date);
                    shiftEnd.setHours(eHrs, eMin, 0, 0);

                    if (now > shiftEnd) {
                        otMinutes = Math.floor((now.getTime() - shiftEnd.getTime()) / (1000 * 60));
                    }
                }

                const record = await prisma.attendance.update({
                    where: { id: existing.id },
                    data: {
                        checkOut: now,
                        otMinutes
                    }
                });
                return NextResponse.json(record);
            }

            return createErrorResponse('Invalid action', 400);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();

            const result = attendanceCorrectionSchema.safeParse(body);
            if (!result.success) {
                return createErrorResponse(result.error);
            }

            const { id, checkIn, checkOut, status } = result.data;

            const existing = await prisma.attendance.findUnique({
                where: { id },
                include: { employee: true }
            });

            if (!existing) return createErrorResponse('Attendance record not found', 404);

            // Access Control: Manager/TL can only correct their own team
            if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                if (!subIds.includes(existing.employee.userId)) {
                    return createErrorResponse('Forbidden: Not in your team', 403);
                }
            }

            const data: any = {};
            if (checkIn) data.checkIn = checkIn;
            if (checkOut !== undefined) data.checkOut = checkOut;
            if (status) data.status = status;

            const updated = await prisma.attendance.update({
                where: { id },
                data
            });

            return NextResponse.json(updated);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
