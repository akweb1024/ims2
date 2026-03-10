import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute([], async (req: NextRequest, user) => {
    try {
        const folders = await prisma.vaultFolder.findMany({
            where: { userId: user.id },
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(folders);
    } catch (error) {
        return createErrorResponse(error);
    }
});

export const POST = authorizedRoute([], async (req: NextRequest, user) => {
    try {
        const { name, color, icon } = await req.json();

        if (!name) {
            return createErrorResponse('Folder name is required', 400);
        }

        const exists = await prisma.vaultFolder.findUnique({
            where: { userId_name: { userId: user.id, name } }
        });

        if (exists) {
            return createErrorResponse('Folder with this name already exists', 409);
        }

        const folder = await prisma.vaultFolder.create({
            data: {
                userId: user.id,
                name,
                color,
                icon
            }
        });

        return NextResponse.json(folder);
    } catch (error) {
        return createErrorResponse(error);
    }
});
