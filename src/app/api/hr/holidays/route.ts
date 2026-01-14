import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { holidaySchema, updateHolidaySchema } from '@/lib/validators/hr';
import { z } from 'zod';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const queryCompanyId = searchParams.get('companyId');
            const targetCompanyId = queryCompanyId || user.companyId;

            const where: any = {
                OR: [
                    { companyId: targetCompanyId },
                    { companyId: null } // Global holidays
                ]
            };

            const holidays = await prisma.holiday.findMany({
                where,
                include: { company: true },
                orderBy: { date: 'asc' }
            });

            return NextResponse.json(holidays);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();

            if (Array.isArray(body)) {
                // Bulk Create
                const validation = z.array(holidaySchema).safeParse(body);
                if (!validation.success) {
                    return createErrorResponse(validation.error);
                }

                const holidaysData = validation.data.map((h) => ({
                    name: h.name,
                    date: h.date,
                    type: h.type,
                    description: h.description,
                    companyId: user.companyId
                }));

                const result = await prisma.holiday.createMany({
                    data: holidaysData
                });

                return NextResponse.json({ count: result.count, message: 'Bulk import successful' });
            }

            // Single Create
            const validation = holidaySchema.safeParse(body);
            if (!validation.success) {
                return createErrorResponse(validation.error);
            }
            const { name, date, type, description } = validation.data;

            const holiday = await prisma.holiday.create({
                data: {
                    name,
                    date,
                    type,
                    description,
                    companyId: user.companyId
                }
            });

            return NextResponse.json(holiday);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const PUT = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();

            const validation = updateHolidaySchema.safeParse(body);
            if (!validation.success) {
                return createErrorResponse(validation.error);
            }

            const { id, ...updates } = validation.data;
            if (!id) return createErrorResponse('ID is required', 400);

            const holiday = await prisma.holiday.update({
                where: { id },
                data: updates
            });

            return NextResponse.json(holiday);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const id = searchParams.get('id');

            if (!id) return createErrorResponse('ID is required', 400);

            await prisma.holiday.delete({
                where: { id }
            });

            return NextResponse.json({ message: 'Holiday deleted successfully' });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
