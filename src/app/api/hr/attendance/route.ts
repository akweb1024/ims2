import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { attendanceCorrectionSchema, selfServiceAttendanceSchema } from '@/lib/validators/hr';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { getISTToday } from '@/lib/date-utils';
import { upsertAttendanceRecord } from '@/lib/services/attendance-service';
import { reconcileAttendanceLedgerForMonth } from '@/lib/utils/leave-ledger-processor';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const monthStr = searchParams.get('month');
            const yearStr = searchParams.get('year');
            const showAll = searchParams.get('all') === 'true';

            let istStart: Date;
            let istEnd: Date;

            if (yearStr && !monthStr) {
                // Year-only fetch
                const year = parseInt(yearStr);
                istStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
                istStart = new Date(istStart.getTime() - (330 * 60000)); // 00:00 IST Jan 1
                
                istEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
                istEnd = new Date(istEnd.getTime() - (330 * 60000)); // 23:59 IST Dec 31
            } else {
                // Specific month or default to current
                const month = parseInt(monthStr || String(new Date().getMonth() + 1));
                const year = parseInt(yearStr || String(new Date().getFullYear()));

                const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
                istStart = new Date(startDate.getTime() - (330 * 60000));

                const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));
                istEnd = new Date(endDate.getTime() - (330 * 60000));
            }

            const where: Prisma.AttendanceWhereInput = {
                date: {
                    gte: istStart,
                    lte: istEnd
                }
            };



            // ...

            const targetUserId = searchParams.get('targetUserId');

            if (user.companyId) {
                where.companyId = user.companyId;
            }

            if (showAll && ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                // Admin/Managers can request data for specific user or their hierarchy
                if (targetUserId) {
                    // Start of Permissions Check
                    // 1. If Manager/TL, ensure target is in downline (cross-company)
                    if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                        const subIds = await getDownlineUserIds(user.id, null); // Cross-company
                        if (!subIds.includes(targetUserId) && targetUserId !== user.id) {
                            return createErrorResponse('Forbidden: Target user not in your hierarchy', 403);
                        }
                    }
                    // 2. If Admin, ensure target is in same company (handled by where.companyId)
                    // (where.companyId is already set above)

                    // Fetch profile for targetUserId
                    const profile = await prisma.employeeProfile.findUnique({
                        where: { userId: targetUserId }
                    });

                    if (!profile) return NextResponse.json([]); // Or 404
                    where.employeeId = profile.id;
                }
                else if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                    // Original logic for "My Team" (cross-company)
                    const subIds = await getDownlineUserIds(user.id, null); // Cross-company
                    const allowedIds = [...subIds, user.id];
                    where.employee = { userId: { in: allowedIds } };
                }
                // Else (Admin + No Target) => Fetch All for Company (default behavior)
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

            const today = getISTToday();

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

                const record = await upsertAttendanceRecord({
                    employeeId: profile.id,
                    companyId: user.companyId!,
                    date: today,
                    checkIn: new Date(),
                    workFrom: (workFrom as any) || 'OFFICE',
                    latitude: latitude ? parseFloat(String(latitude)) : null,
                    longitude: longitude ? parseFloat(String(longitude)) : null,
                    locationName
                });

                return NextResponse.json(record);
            } else if (action === 'check-out') {
                if (!existing?.checkIn) return createErrorResponse('Must check in first', 400);
                if (existing.checkOut) return createErrorResponse('Already checked out today', 400);

                const record = await upsertAttendanceRecord({
                    employeeId: profile.id,
                    companyId: user.companyId!,
                    date: today,
                    checkOut: new Date()
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

            // Access Control: Manager/TL can only correct their own team (cross-company)
            if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const subIds = await getDownlineUserIds(user.id, null); // Cross-company
                if (!subIds.includes(existing.employee.userId)) {
                    return createErrorResponse('Forbidden: Not in your team', 403);
                }
            }

            const updated = await upsertAttendanceRecord({
                employeeId: existing.employeeId,
                companyId: existing.companyId || user.companyId,
                date: existing.date,
                checkIn: checkIn ?? null,
                checkOut: checkOut ?? null,
                status,
                workFrom: (existing.workFrom as any) || 'OFFICE',
                latitude: existing.latitude,
                longitude: existing.longitude,
                locationName: existing.locationName,
                remarks: existing.remarks,
                isManual: true,
                skipSideEffects: true
            });

            await reconcileAttendanceLedgerForMonth(existing.employeeId, existing.date, existing.companyId || user.companyId);

            return NextResponse.json(updated);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
