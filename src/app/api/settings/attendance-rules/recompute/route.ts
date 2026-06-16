import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { prisma } from '@/lib/prisma';
import { dashboardRecomputeSchema } from '@/lib/validation/schemas';
import { upsertAttendanceRecord } from '@/lib/services/attendance-service';
import { reconcileAttendanceLedgerForMonth } from '@/lib/utils/leave-ledger-processor';

export const POST = authorizedRoute(['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'], async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const validation = dashboardRecomputeSchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse(validation.error, 400);
    }

    const data = validation.data;
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return createErrorResponse('Invalid date range', 400);
    }

    const where: any = {
      date: { gte: startDate, lte: endDate },
      ...(data.companyId ? { companyId: data.companyId } : user.companyId ? { companyId: user.companyId } : {}),
    };

    if (data.employeeId) {
      where.employeeId = data.employeeId;
    }

    const records = await prisma.attendance.findMany({
      where,
      orderBy: [{ employeeId: 'asc' }, { date: 'asc' }],
    });

    if (data.dryRun) {
      return NextResponse.json({
        dryRun: true,
        records: records.length,
        employees: new Set(records.map((record) => record.employeeId)).size,
      });
    }

    const touchedMonths = new Set<string>();
    const recomputeKeys = new Set<string>();

    for (const record of records) {
      await upsertAttendanceRecord({
        employeeId: record.employeeId,
        companyId: record.companyId || data.companyId || user.companyId || undefined,
        date: record.date,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        workFrom: record.workFrom as any,
        status: record.status,
        latitude: record.latitude,
        longitude: record.longitude,
        locationName: record.locationName,
        remarks: record.remarks,
        isManual: true,
        skipSideEffects: true,
      });
      const monthKey = `${record.employeeId}:${record.date.getFullYear()}-${record.date.getMonth() + 1}`;
      touchedMonths.add(monthKey);
      recomputeKeys.add(monthKey);
    }

    for (const key of recomputeKeys) {
      const [employeeId, yearMonth] = key.split(':');
      const [yearStr, monthStr] = yearMonth.split('-');
      const year = Number(yearStr);
      const month = Number(monthStr);
      const sample = records.find((record) => record.employeeId === employeeId && record.date.getFullYear() === year && record.date.getMonth() + 1 === month);
      if (!sample) continue;
      await reconcileAttendanceLedgerForMonth(
        sample.employeeId,
        sample.date,
        sample.companyId || data.companyId || user.companyId || null,
      );
    }

    return NextResponse.json({
      dryRun: false,
      recordsRecomputed: records.length,
      employeesAffected: new Set(records.map((record) => record.employeeId)).size,
      touchedMonths: Array.from(touchedMonths),
    });
  } catch (error) {
    return createErrorResponse(error);
  }
});
