import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { processLateArrival, processShortLeave } from '@/lib/utils/leave-ledger-processor';
import { resolveEffectiveAttendancePolicy, resolveThresholdDate, getMinutesDifference } from '@/lib/attendance-policy';

export interface AttendanceUpsertInput {
    employeeId: string;
    companyId?: string | null;
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
    skipSideEffects?: boolean;
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
        companyId, isManual, remarks, skipSideEffects
    } = input;

    // 1. Fetch Shift Roster for calculation — a day-specific override, if one exists — else
    // fall back to the employee's standing shift assignment (EmployeeProfile.shiftId).
    const roster = await tx.shiftRoster.findUnique({
        where: { employeeId_date: { employeeId, date } },
        include: { shift: true }
    });
    const standingProfile = !roster?.shift
        ? await tx.employeeProfile.findUnique({ where: { id: employeeId }, select: { shift: true } })
        : null;
    const effectiveShift = roster?.shift || standingProfile?.shift || null;

    const existing = await tx.attendance.findUnique({
        where: { employeeId_date: { employeeId, date } }
    });

    // Determine effective check-in and check-out
    const effectiveCheckIn = checkIn !== undefined ? checkIn : existing?.checkIn;
    const effectiveCheckOut = checkOut !== undefined ? checkOut : existing?.checkOut;

    let lateMinutes = 0;
    let shortMinutes = 0;
    let otMinutes = 0;
    let isLate = false;
    let isShort = false;
    let isGeofenced = isManual || workFrom === 'REMOTE';
    const shiftId = effectiveShift?.id || null;
    const policy = await resolveEffectiveAttendancePolicy({ employeeId, companyId });

    // 2. Geofencing check (if not manual and not remote)
    if (!isManual && workFrom !== 'REMOTE' && latitude && longitude && companyId) {
        const company = await tx.company.findUnique({
            where: { id: companyId! },
            select: { latitude: true, longitude: true }
        });

        if (company?.latitude && company?.longitude) {
            const distance = calculateDistance(latitude, longitude, company.latitude, company.longitude);
            isGeofenced = distance < 200; // 200m radius
        }
    }

    // 3. Attendance Threshold Calculation (IST-aware company/employee policy)
    if (effectiveCheckIn) {
        const lateThreshold = resolveThresholdDate(date, policy.lateCheckInTime);
        const shortThreshold = resolveThresholdDate(date, policy.shortLeaveTime);

        if (effectiveCheckIn > lateThreshold) {
            lateMinutes = getMinutesDifference(effectiveCheckIn, lateThreshold);
            isLate = lateMinutes > 0;
        }

        if (effectiveCheckIn > shortThreshold) {
            shortMinutes = getMinutesDifference(effectiveCheckIn, shortThreshold);
            isShort = shortMinutes > 0;
        }
    }

    // 4. OT Calculation remains shift-based when a roster or standing shift applies
    if (effectiveCheckOut && effectiveShift) {
        const shift = effectiveShift;
        const [eHrs, eMin] = shift.endTime.split(':').map(Number);
        const shiftEnd = new Date(date);
        shiftEnd.setHours(eHrs, eMin, 0, 0);

        if (effectiveCheckOut > shiftEnd) {
            otMinutes = getMinutesDifference(effectiveCheckOut, shiftEnd);
        }
    }

    const payloadCheckIn = checkIn !== undefined ? checkIn : undefined;
    const payloadCheckOut = checkOut !== undefined ? checkOut : undefined;

    // 5. Upsert Data
    const record = await tx.attendance.upsert({
        where: {
            employeeId_date: { employeeId, date }
        },
        update: {
            checkIn: payloadCheckIn,
            checkOut: payloadCheckOut,
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
            companyId: companyId || undefined
        },
        create: {
            employeeId,
            date,
            checkIn: payloadCheckIn ?? null,
            checkOut: payloadCheckOut ?? null,
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
            companyId: companyId || undefined
        }
    });

    // 6. Triggers (Side Effects)
    // Run side effects ONLY on check-out to automate end-of-day leave deductions properly
    // and to prevent double-penalization for the same day.
    const isFirstTimeCheckOut = payloadCheckOut != null && existing?.checkOut == null;

    if (!skipSideEffects && (isFirstTimeCheckOut || isManual)) {
        if (lateMinutes >= 31) {
            await processLateArrival(employeeId, lateMinutes, companyId);
        }

        if (shortMinutes >= 90) {
            await processShortLeave(employeeId, shortMinutes, companyId);
        }
    }

    return record;
}
