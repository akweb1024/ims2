import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(['SUPER_ADMIN', 'ADMIN'], async () => {
    try {
        const globalDesigs = await prisma.globalDesignation.findMany({
            orderBy: { level: 'asc' }
        });
        return NextResponse.json(globalDesigs);
    } catch (error) {
        return createErrorResponse(error);
    }
});

export const POST = authorizedRoute(['SUPER_ADMIN'], async (req: NextRequest) => {
    try {
        const body = await req.json();
        const { id, name, code, level, syncCompanyIds } = body;

        let globalDesig;

        if (id) {
            globalDesig = await prisma.globalDesignation.update({
                where: { id },
                data: { name, code, level: Number(level) }
            });
        } else {
            const existing = await prisma.globalDesignation.findUnique({ where: { name } });
            if (existing) return createErrorResponse('Global Designation already exists', 400);

            globalDesig = await prisma.globalDesignation.create({
                data: { name, code, level: Number(level || 1) }
            });
        }

        if (Array.isArray(syncCompanyIds) && syncCompanyIds.length > 0) {
            const operations = syncCompanyIds.map(async (companyId) => {
                const existingByName = await prisma.designation.findFirst({
                    where: {
                        companies: { some: { id: companyId } },
                        name: { equals: globalDesig.name, mode: 'insensitive' }
                    }
                });

                if (!existingByName) {
                    // Create designation and connect to company
                    return prisma.designation.create({
                        data: {
                            name: globalDesig.name,
                            code: globalDesig.code || globalDesig.name.substring(0, 10).toUpperCase(),
                            level: globalDesig.level,
                            companies: { connect: { id: companyId } }
                        }
                    });
                }
                return null;
            });
            await Promise.all(operations);
        }

        return NextResponse.json(globalDesig);
    } catch (error) {
        return createErrorResponse(error);
    }
});
