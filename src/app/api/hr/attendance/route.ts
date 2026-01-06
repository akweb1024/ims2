import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!user.companyId && user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Company association required' }, { status: 403 });
        }

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

        console.log('📅 Attendance GET - Date Filter:', {
            month,
            year,
            gte: new Date(year, month - 1, 1),
            lte: new Date(year, month, 0)
        });

        // Company Isolation
        if (user.companyId) {
            where.companyId = user.companyId;
        }

        if (showAll && ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
            // Admin/Managers see their company/team
        } else {
            const profile = await prisma.employeeProfile.findUnique({
                where: { userId: user.id }
            });
            console.log('👤 Employee Profile Found:', !!profile, profile?.id);
            if (!profile) return NextResponse.json([]);
            where.employeeId = profile.id;
        }

        console.log('🔍 Attendance WHERE clause:', where);

        const attendance = await prisma.attendance.findMany({
            where,
            include: {
                employee: {
                    include: { user: { select: { email: true } } }
                }
            },
            orderBy: { date: 'asc' }
        });

        console.log('✅ Attendance Records Found:', attendance.length);
        if (attendance.length > 0) {
            console.log('📊 Sample record:', attendance[0]);
        }

        return NextResponse.json(attendance);
    } catch (error) {
        console.error('❌ Attendance GET Error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Verify user actually exists (handles stale tokens after re-seed)
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (!dbUser) return NextResponse.json({ error: 'Session expired. Please login again.' }, { status: 401 });

        const body = await req.json();
        const { action, workFrom } = body;

        let profile = await prisma.employeeProfile.findUnique({
            where: { userId: user.id }
        });

        if (!profile) {
            try {
                profile = await prisma.employeeProfile.create({
                    data: { userId: user.id }
                });
            } catch (e: any) {
                // If race condition happens and profile created by another req, find it again
                if (e && typeof e === 'object' && 'code' in e && e.code === 'P2002') {
                    profile = await prisma.employeeProfile.findUnique({
                        where: { userId: user.id }
                    });
                } else {
                    throw e;
                }
            }
        }

        // Just in case profile is still null (should not happen if user exists)
        if (!profile) return NextResponse.json({ error: 'Failed to initialize employee profile' }, { status: 500 });

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
            if (existing?.checkIn) return NextResponse.json({ error: 'Already checked in today' }, { status: 400 });

            const isRemote = workFrom === 'REMOTE';
            const userLat = parseFloat(body.latitude);
            const userLon = parseFloat(body.longitude);

            let isGeofenced = false;

            // Get company coordinates
            if (user.companyId && !isRemote) {
                const company = await prisma.company.findUnique({
                    where: { id: user.companyId },
                    select: { latitude: true, longitude: true }
                });

                if (company?.latitude && company?.longitude && !isNaN(userLat) && !isNaN(userLon)) {
                    // Haversine formula to calculate distance in meters
                    const R = 6371e3; // Earth radius in meters
                    const φ1 = (userLat * Math.PI) / 180;
                    const φ2 = (company.latitude * Math.PI) / 180;
                    const Δφ = ((company.latitude - userLat) * Math.PI) / 180;
                    const Δλ = ((company.longitude - userLon) * Math.PI) / 180;

                    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                        Math.cos(φ1) * Math.cos(φ2) *
                        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    const distance = R * c;

                    isGeofenced = distance < 200; // 200 meters accuracy
                    console.log(`📍 Geofence Check: Distance = ${distance.toFixed(2)}m, isGeofenced = ${isGeofenced}`);
                }
            } else if (isRemote) {
                isGeofenced = true; // Remote work is always "geofenced" by definition of being allowed anywhere
            }

            const record = await prisma.attendance.upsert({
                where: {
                    employeeId_date: {
                        employeeId: profile.id,
                        date: today
                    }
                },
                update: {
                    checkIn: new Date(),
                    workFrom: workFrom || 'OFFICE',
                    latitude: isNaN(userLat) ? null : userLat,
                    longitude: isNaN(userLon) ? null : userLon,
                    isGeofenced,
                    locationName: body.locationName || (isRemote ? 'Remote Location' : 'Office HQ'),
                    companyId: user.companyId
                },
                create: {
                    employeeId: profile.id,
                    date: today,
                    checkIn: new Date(),
                    workFrom: workFrom || 'OFFICE',
                    status: 'PRESENT',
                    latitude: isNaN(userLat) ? null : userLat,
                    longitude: isNaN(userLon) ? null : userLon,
                    isGeofenced,
                    locationName: body.locationName || (isRemote ? 'Remote Location' : 'Office HQ'),
                    companyId: user.companyId
                }
            });
            return NextResponse.json(record);
        } else if (action === 'check-out') {
            if (!existing?.checkIn) return NextResponse.json({ error: 'Must check in first' }, { status: 400 });
            if (existing.checkOut) return NextResponse.json({ error: 'Already checked out today' }, { status: 400 });

            const record = await prisma.attendance.update({
                where: { id: existing.id },
                data: { checkOut: new Date() }
            });
            return NextResponse.json(record);
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Attendance POST Error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { id, checkIn, checkOut, status } = await req.json();

        const data: any = {};
        if (checkIn) data.checkIn = new Date(checkIn);
        if (checkOut) data.checkOut = new Date(checkOut);
        if (status) data.status = status;

        const updated = await prisma.attendance.update({
            where: { id },
            data
        });

        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
