import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const POST = authorizedRoute([], async (req: NextRequest, user) => {
    try {
        const body = await req.json();
        const { itemId, grantedToId, encryptedKey, canEdit } = body;

        if (!itemId || !grantedToId || !encryptedKey) {
            return createErrorResponse('Missing required fields', 400);
        }

        // Verify the user owns the item
        const item = await prisma.vaultItem.findUnique({
            where: { id: itemId }
        });

        if (!item || item.ownerId !== user.id) {
            return createErrorResponse('Item not found or permission denied', 403);
        }

        // Create or update the access record
        const access = await prisma.vaultAccess.upsert({
            where: {
                itemId_grantedToId: {
                    itemId: itemId,
                    grantedToId: grantedToId
                }
            },
            update: {
                encryptedKey,
                canEdit: canEdit || false
            },
            create: {
                itemId,
                grantedToId,
                grantedById: user.id,
                encryptedKey,
                canEdit: canEdit || false
            }
        });

        // Mark item as shared
        if (!item.isShared) {
            await prisma.vaultItem.update({
                where: { id: itemId },
                data: { isShared: true }
            });
        }

        return NextResponse.json(access);
    } catch (error) {
        return createErrorResponse(error);
    }
});
