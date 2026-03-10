import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute([], async (req: NextRequest, user) => {
    try {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email');

        if (!email) {
            return createErrorResponse('Email is required', 400);
        }

        const targetUser = await prisma.user.findUnique({
            where: { email },
            include: { vaultKeyring: true }
        });

        if (!targetUser) {
            return createErrorResponse('User not found', 404);
        }

        if (!targetUser.vaultKeyring) {
            return createErrorResponse('User has not initialized their Web Vault', 404);
        }

        return NextResponse.json({
            id: targetUser.id,
            name: targetUser.name,
            email: targetUser.email,
            publicKey: targetUser.vaultKeyring.publicKey
        });
    } catch (error) {
        return createErrorResponse(error);
    }
});
