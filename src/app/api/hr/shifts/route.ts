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

            const shift = await prisma.shift.update({
                where: { id },
                data: {
                    ...data,
                    gracePeriod: data.gracePeriod ? parseInt(data.gracePeriod) : undefined
                }
            });

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

            await prisma.shift.delete({ where: { id } });
            return NextResponse.json({ message: 'Shift deleted' });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
