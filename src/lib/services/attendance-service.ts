import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { processLateArrival, processShortLeave } from '@/lib/utils/leave-ledger-processor';

export interface AttendanceUpsertInput {
    employeeId: string;
    companyId: string;
    date: Date;
    checkIn?: Date | null;
    checkOut?: Date | null;
    workFrom?: 'OFFICE' | 'REMOTE' | 'FIELD';
    status?: string;
    latitude?: number | null;
    longitude?: number | null;
    locationName?: string | null;
    remarks?: string | null;
    isManual?: boolean;
}

/**
 * Calculates the distance between two coordinates in meters using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Centralized logic for attendance record processing
 */
export async function upsertAttendanceRecord(
    input: AttendanceUpsertInput,
    tx: Prisma.TransactionClient = prisma
) {
    const {
        employeeId, date, checkIn, checkOut, workFrom,
        status, latitude, longitude, locationName,
        companyId, isManual, remarks
    } = input;

    // 1. Fetch Shift Roster for calculation
    const roster = await tx.shiftRoster.findUnique({
        where: { employeeId_date: { employeeId, date } },
        include: { shift: true }
    });

    let lateMinutes = 0;
    let shortMinutes = 0;
    let otMinutes = 0;
    let isLate = false;
    let isShort = false;
    let isGeofenced = isManual || workFrom === 'REMOTE';
    const shiftId = roster?.shiftId || null;

    // 2. Geofencing check (if not manual and not remote)
    if (!isManual && workFrom !== 'REMOTE' && latitude && longitude) {
        const company = await tx.company.findUnique({
            where: { id: companyId },
            select: { latitude: true, longitude: true }
        });

        if (company?.latitude && company?.longitude) {
            const distance = calculateDistance(latitude, longitude, company.latitude, company.longitude);
            isGeofenced = distance < 200; // 200m radius
        }
    }

    // 3. Late Arrival Calculation
    if (checkIn && roster?.shift) {
        const shift = roster.shift;
        const [sHrs, sMin] = shift.startTime.split(':').map(Number);
        const shiftStart = new Date(date);
        shiftStart.setHours(sHrs, sMin, 0, 0);

        const graceLimit = new Date(shiftStart);
        graceLimit.setMinutes(graceLimit.getMinutes() + (shift.gracePeriod || 0));

        if (checkIn > graceLimit) {
            lateMinutes = Math.floor((checkIn.getTime() - shiftStart.getTime()) / (1000 * 60));
            isLate = lateMinutes > 0;
        }
    }

    // 4. Short Leave / OT Calculation
    if (checkOut && roster?.shift) {
        const shift = roster.shift;
        const [eHrs, eMin] = shift.endTime.split(':').map(Number);
        const shiftEnd = new Date(date);
        shiftEnd.setHours(eHrs, eMin, 0, 0);

        if (checkOut > shiftEnd) {
            otMinutes = Math.floor((checkOut.getTime() - shiftEnd.getTime()) / (1000 * 60));
        } else {
            shortMinutes = Math.floor((shiftEnd.getTime() - checkOut.getTime()) / (1000 * 60));
            isShort = shortMinutes > 0;
        }
    }

    // 5. Upsert Data
    const record = await tx.attendance.upsert({
        where: {
            employeeId_date: { employeeId, date }
        },
        update: {
            checkIn: checkIn ?? undefined,
            checkOut: checkOut ?? undefined,
            workFrom: workFrom || 'OFFICE',
            status: status || 'PRESENT',
            latitude: latitude ?? undefined,
            longitude: longitude ?? undefined,
            isGeofenced,
            locationName: locationName || (isManual ? 'Manual Entry' : undefined),
            lateMinutes,
            shortMinutes,
            otMinutes,
            isLate,
            isShort,
            shiftId,
            remarks: remarks ?? undefined,
            companyId: companyId
        },
        create: {
            employeeId,
            date,
            checkIn: checkIn ?? null,
            checkOut: checkOut ?? null,
            workFrom: workFrom || 'OFFICE',
            status: status || 'PRESENT',
            latitude: latitude ?? null,
            longitude: longitude ?? null,
            isGeofenced,
            locationName: locationName || (isManual ? 'Manual Entry' : undefined),
            lateMinutes,
            shortMinutes,
            otMinutes,
            isLate,
            isShort,
            shiftId,
            remarks: remarks ?? null,
            companyId: companyId
        }
    });

    // 6. Triggers (Side Effects)
    // Only run side effects if not in a critical bulk operation or if explicitly requested?
    // For now, mirroring existing behavior:
    if (lateMinutes >= 31) {
        await processLateArrival(employeeId, lateMinutes, companyId);
    }

    if (shortMinutes >= 90) {
        await processShortLeave(employeeId, shortMinutes, companyId);
    }

    return record;
}
