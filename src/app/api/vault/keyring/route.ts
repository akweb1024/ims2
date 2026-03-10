import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute([], async (req: NextRequest, user) => {
    try {
        const keyring = await prisma.vaultKeyring.findUnique({
            where: { userId: user.id }
        });

        if (!keyring) {
            return NextResponse.json({ exists: false });
        }

        return NextResponse.json({
            exists: true,
            encryptedPrivKey: keyring.encryptedPrivKey,
            publicKey: keyring.publicKey,
            salt: keyring.salt,
            iv: keyring.iv,
            updatedAt: keyring.updatedAt
        });
    } catch (error) {
        return createErrorResponse(error);
    }
});

export const POST = authorizedRoute([], async (req: NextRequest, user) => {
    try {
        const body = await req.json();
        const { encryptedPrivKey, publicKey, salt, iv } = body;

        if (!encryptedPrivKey || !publicKey || !salt || !iv) {
            return createErrorResponse("Missing keyring elements", 400);
        }

        const keyring = await prisma.vaultKeyring.upsert({
            where: { userId: user.id },
            update: {
                encryptedPrivKey,
                publicKey,
                salt,
                iv
            },
            create: {
                userId: user.id,
                encryptedPrivKey,
                publicKey,
                salt,
                iv
            }
        });

        return NextResponse.json(keyring);
    } catch (error) {
        return createErrorResponse(error);
    }
});
