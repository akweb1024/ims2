import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { prisma } from '@/lib/prisma';
import { attendancePolicySchema } from '@/lib/validation/schemas';

export const GET = authorizedRoute(['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'], async (_req: NextRequest, user) => {
  try {
    const [globalPolicy, companyPolicy] = await Promise.all([
      prisma.attendancePolicy.findUnique({ where: { id: 'singleton' } }),
      user.companyId ? prisma.companyAttendancePolicy.findUnique({ where: { companyId: user.companyId } }) : Promise.resolve(null),
    ]);

    return NextResponse.json({
      global: globalPolicy,
      company: companyPolicy,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
});

export const PATCH = authorizedRoute(['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'], async (req: NextRequest, user) => {
  try {
    const body = await req.json();
    const validation = attendancePolicySchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse(validation.error, 400);
    }

    const data = validation.data;
    const companyId = data.companyId !== undefined ? data.companyId : user.companyId ?? null;

    if (companyId) {
      const updated = await prisma.companyAttendancePolicy.upsert({
        where: { companyId },
        update: {
          timezone: data.timezone,
          lateCheckInTime: data.lateCheckInTime,
          shortLeaveTime: data.shortLeaveTime,
          graceMinutes: data.graceMinutes,
          isActive: data.isActive ?? true,
        },
        create: {
          companyId,
          timezone: data.timezone,
          lateCheckInTime: data.lateCheckInTime,
          shortLeaveTime: data.shortLeaveTime,
          graceMinutes: data.graceMinutes,
          isActive: data.isActive ?? true,
        },
      });
      return NextResponse.json(updated);
    }

    const updated = await prisma.attendancePolicy.upsert({
      where: { id: 'singleton' },
      update: {
        timezone: data.timezone,
        lateCheckInTime: data.lateCheckInTime,
        shortLeaveTime: data.shortLeaveTime,
        graceMinutes: data.graceMinutes,
        isActive: data.isActive ?? true,
      },
      create: {
        id: 'singleton',
        timezone: data.timezone,
        lateCheckInTime: data.lateCheckInTime,
        shortLeaveTime: data.shortLeaveTime,
        graceMinutes: data.graceMinutes,
        isActive: data.isActive ?? true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return createErrorResponse(error);
  }
});
