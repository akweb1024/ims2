import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { prisma } from '@/lib/prisma';
import { employeeAttendanceOverrideSchema } from '@/lib/validation/schemas';

export const GET = authorizedRoute(['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'], async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    if (!employeeId) return createErrorResponse('employeeId is required', 400);

    const override = await prisma.employeeAttendancePolicyOverride.findUnique({ where: { employeeId } });
    return NextResponse.json(override);
  } catch (error) {
    return createErrorResponse(error);
  }
});

export const PATCH = authorizedRoute(['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'], async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const validation = employeeAttendanceOverrideSchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse(validation.error, 400);
    }

    const data = validation.data;
    const employee = await prisma.employeeProfile.findUnique({
      where: { id: data.employeeId },
      include: { user: true },
    });

    if (!employee) return createErrorResponse('Employee not found', 404);
    if (user.companyId && employee.user.companyId !== user.companyId && user.role !== 'SUPER_ADMIN') {
      return createErrorResponse('Forbidden', 403);
    }

    const updated = await prisma.employeeAttendancePolicyOverride.upsert({
      where: { employeeId: data.employeeId },
      update: {
        companyId: data.companyId !== undefined ? data.companyId : user.companyId ?? null,
        timezone: data.timezone ?? undefined,
        lateCheckInTime: data.lateCheckInTime ?? undefined,
        shortLeaveTime: data.shortLeaveTime ?? undefined,
        graceMinutes: data.graceMinutes ?? undefined,
        isActive: data.isActive ?? true,
        notes: data.notes ?? null,
      },
      create: {
        employeeId: data.employeeId,
        companyId: data.companyId !== undefined ? data.companyId : user.companyId ?? null,
        timezone: data.timezone || 'Asia/Kolkata',
        lateCheckInTime: data.lateCheckInTime || null,
        shortLeaveTime: data.shortLeaveTime || null,
        graceMinutes: data.graceMinutes ?? null,
        isActive: data.isActive ?? true,
        notes: data.notes ?? null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return createErrorResponse(error);
  }
});
