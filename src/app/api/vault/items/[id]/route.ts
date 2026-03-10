import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const PATCH = authorizedRoute([], async (req: NextRequest, user, context) => {
    try {
        const itemId = context.params.id;
        const body = await req.json();
        const { title, username, website, icon, folderId, encryptedData, iv, isFavorite, newPassword } = body;

        // Check ownership or edit access
        const item = await prisma.vaultItem.findUnique({
            where: { id: itemId },
            include: { sharedAccess: { where: { grantedToId: user.id } } }
        });

        if (!item) return createErrorResponse('Item not found', 404);

        const isOwner = item.ownerId === user.id;
        const hasEditAccess = !isOwner && item.sharedAccess.length > 0 && item.sharedAccess[0].canEdit;

        if (!isOwner && !hasEditAccess) {
            return createErrorResponse('Permission denied', 403);
        }

        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (username !== undefined) updateData.username = username;
        if (website !== undefined) updateData.website = website;
        if (icon !== undefined) updateData.icon = icon;
        if (folderId !== undefined) updateData.folderId = folderId;
        if (encryptedData !== undefined) updateData.encryptedData = encryptedData;
        if (iv !== undefined) updateData.iv = iv;
        if (isFavorite !== undefined) updateData.isFavorite = isFavorite;
        
        if (newPassword) {
            updateData.lastPasswordUpdate = new Date();
        }

        const updatedItem = await prisma.vaultItem.update({
            where: { id: itemId },
            data: updateData
        });

        return NextResponse.json(updatedItem);
    } catch (error) {
        return createErrorResponse(error);
    }
});

export const DELETE = authorizedRoute([], async (req: NextRequest, user, context) => {
    try {
        const itemId = context.params.id;

        const item = await prisma.vaultItem.findUnique({
            where: { id: itemId },
            include: { sharedAccess: { where: { grantedToId: user.id } } }
        });

        if (!item) return createErrorResponse('Item not found', 404);

        if (item.ownerId === user.id) {
            // Owner deletes the item completely
            await prisma.vaultItem.delete({ where: { id: itemId } });
            return NextResponse.json({ success: true, message: 'Item deleted' });
        } else if (item.sharedAccess.length > 0) {
            // Recipient removes their own access
            await prisma.vaultAccess.delete({ where: { id: item.sharedAccess[0].id } });
            return NextResponse.json({ success: true, message: 'Access removed' });
        } else {
            return createErrorResponse('Permission denied', 403);
        }
    } catch (error) {
        return createErrorResponse(error);
    }
});
