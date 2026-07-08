import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            if (!user.companyId) return createErrorResponse('Company context required', 400);

            const shifts = await prisma.shift.findMany({
                where: { companyId: user.companyId },
                orderBy: { startTime: 'asc' }
            });

            return NextResponse.json(shifts);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            if (!user.companyId) return createErrorResponse('Company context required', 400);
            const { name, startTime, endTime, gracePeriod, isNightShift } = await req.json();

            const shift = await prisma.shift.create({
                data: {
                    name,
                    startTime,
                    endTime,
                    gracePeriod: parseInt(gracePeriod || '15'),
                    isNightShift: !!isNightShift,
                    companyId: user.companyId
                }
            });

            return NextResponse.json(shift);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { id, ...data } = body;

            const existing = await prisma.shift.findUnique({ where: { id }, select: { companyId: true } });
            if (!existing) return createErrorResponse('Shift not found', 404);
            if (user.role !== 'SUPER_ADMIN' && existing.companyId !== user.companyId) {
                return createErrorResponse('Forbidden', 403);
            }

            const updateData = {
                ...data,
                gracePeriod: data.gracePeriod ? parseInt(data.gracePeriod) : undefined
            };

            // Only one default shift per company — marking one default clears any other.
            const shift = data.isDefault === true
                ? await prisma.$transaction(async (tx) => {
                    await tx.shift.updateMany({
                        where: { companyId: existing.companyId, id: { not: id } },
                        data: { isDefault: false }
                    });
                    return tx.shift.update({ where: { id }, data: updateData });
                })
                : await prisma.shift.update({ where: { id }, data: updateData });

            return NextResponse.json(shift);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const id = searchParams.get('id');
            if (!id) return createErrorResponse('ID required', 400);

            const existing = await prisma.shift.findUnique({ where: { id }, select: { companyId: true } });
            if (!existing) return createErrorResponse('Shift not found', 404);
            if (user.role !== 'SUPER_ADMIN' && existing.companyId !== user.companyId) {
                return createErrorResponse('Forbidden', 403);
            }

            await prisma.shift.delete({ where: { id } });
            return NextResponse.json({ message: 'Shift deleted' });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
