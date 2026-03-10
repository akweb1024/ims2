import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute([], async (req: NextRequest, user) => {
    try {
        const items = await prisma.vaultItem.findMany({
            where: {
                OR: [
                    { ownerId: user.id },
                    { sharedAccess: { some: { grantedToId: user.id } } }
                ]
            },
            include: {
                sharedAccess: {
                    where: { grantedToId: user.id }
                },
                folder: {
                    select: { name: true, color: true, icon: true }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        const mappedItems = items.map(item => {
            const { sharedAccess, ...rest } = item;
            if (item.ownerId === user.id) {
                return { ...rest, myEncryptedKey: item.encryptedKey, canEdit: true, isShared: false };
            } else {
                const access = sharedAccess[0];
                return { 
                    ...rest, 
                    myEncryptedKey: access?.encryptedKey, 
                    canEdit: access?.canEdit, 
                    isShared: true 
                };
            }
        });

        return NextResponse.json(mappedItems);
    } catch (error) {
        return createErrorResponse(error);
    }
});

export const POST = authorizedRoute([], async (req: NextRequest, user) => {
    try {
        const body = await req.json();
        const { type, title, username, website, icon, folderId, encryptedData, encryptedKey, iv, isFavorite } = body;

        if (!title || !encryptedData || !encryptedKey || !iv) {
            return createErrorResponse('Missing required fields', 400);
        }

        const item = await prisma.vaultItem.create({
            data: {
                ownerId: user.id,
                folderId: folderId || null,
                type: type || 'LOGIN',
                title,
                username,
                website,
                icon,
                encryptedData,
                encryptedKey,
                iv,
                isFavorite: isFavorite || false
            }
        });

        return NextResponse.json(item);
    } catch (error) {
        return createErrorResponse(error);
    }
});
