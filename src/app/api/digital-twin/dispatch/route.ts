import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const DispatchSchema = z.object({
    userId: z.string().min(1, 'Employee user ID is required'),
    inventoryItemId: z.string().min(1, 'Inventory item ID is required'),
    title: z.string().optional(),
    notes: z.string().optional(),
});

/**
 * POST /api/digital-twin/dispatch
 * Creates a new Task linked to an InventoryItem, creating a "Smart Dispatch" thread.
 */
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const parsed = DispatchSchema.safeParse(body);

            if (!parsed.success) {
                return NextResponse.json(
                    { error: 'Invalid dispatch data', details: parsed.error.flatten() },
                    { status: 400 }
                );
            }

            const { userId, inventoryItemId, title, notes } = parsed.data;

            // Verify the inventory item belongs to the same company
            const item = await prisma.inventoryItem.findFirst({
                where: { id: inventoryItemId, companyId: user.companyId! },
                select: { id: true, name: true, sku: true },
            });

            if (!item) {
                return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
            }

            // Create the dispatched task
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 1); // Default: due tomorrow

            const task = await prisma.task.create({
                data: {
                    userId,
                    assignedById: user.id,
                    title: title || `[DISPATCH] Restock ${item.name}`,
                    description: notes || `Smart Dispatch: Assigned to handle inventory item ${item.sku}.`,
                    dueDate,
                    priority: 'HIGH',
                    status: 'IN_PROGRESS',
                    inventoryItemId: item.id,
                    companyId: user.companyId,
                },
                select: { id: true, title: true, status: true },
            });

            logger.info('Smart Dispatch created', {
                taskId: task.id,
                assignedTo: userId,
                itemId: item.id,
                dispatchedBy: user.id,
            });

            return NextResponse.json({ success: true, task }, { status: 201 });

        } catch (error) {
            logger.error('Smart Dispatch failed', error, { path: req.nextUrl.pathname });
            return handleApiError(error, req.nextUrl.pathname);
        }
    }
);
