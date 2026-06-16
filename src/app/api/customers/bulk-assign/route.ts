import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { createNotification } from '@/lib/system-notifications';
import { buildCustomerTypeWhere } from '@/lib/customer-filter';

export async function POST(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'MANAGER'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { assignedToUserId, filters, customerIds } = body;

        if (!assignedToUserId && assignedToUserId !== null) { // Allow null to unassign
            return NextResponse.json({ error: 'Target user is required' }, { status: 400 });
        }

        const where: any = {};
        const userCompanyId = (decoded as any).companyId;

        // Multi-tenancy: Restrict to company if not SUPER_ADMIN
        if (decoded.role !== 'SUPER_ADMIN' && userCompanyId) {
            where.companyId = userCompanyId;
        }

        if (customerIds && Array.isArray(customerIds) && customerIds.length > 0) {
            where.id = { in: customerIds };
        } else if (filters && Object.keys(filters).length > 0) {
            // Apply filters
            if (filters.country) where.country = { contains: filters.country };
            if (filters.state) where.state = { contains: filters.state };
            const typeWhere = buildCustomerTypeWhere(filters.customerType);
            if (typeWhere) Object.assign(where, typeWhere);
            if (filters.organizationName) where.organizationName = { contains: filters.organizationName };
        } else {
            return NextResponse.json({ error: 'Either specific customers or filters are required' }, { status: 400 });
        }

        // Fetch customers to update. Cap the batch so an over-broad filter can't
        // match the whole table and exhaust the connection pool / time out.
        const MAX_BULK = 1000;
        const customersToUpdate = await prisma.customerProfile.findMany({
            where,
            select: { id: true },
            take: MAX_BULK + 1,
        });

        if (customersToUpdate.length === 0) {
            return NextResponse.json({ message: 'No customers found to assign', count: 0 });
        }

        if (customersToUpdate.length > MAX_BULK) {
            return NextResponse.json(
                { error: `Too many customers matched (>${MAX_BULK}). Narrow the filter and try again.` },
                { status: 400 },
            );
        }

        // Perform updates atomically (Prisma updateMany doesn't support
        // many-to-many connects). A failure mid-way rolls the whole batch back
        // instead of leaving a partial reassignment.
        if (assignedToUserId) {
            await prisma.$transaction(customersToUpdate.map(customer =>
                prisma.customerProfile.update({
                    where: { id: customer.id },
                    data: {
                        assignedToUserId: assignedToUserId, // Keep primary for compatibility
                        assignedExecutives: {
                            connect: { id: assignedToUserId }
                        }
                    }
                })
            ));
        } else if (assignedToUserId === null) {
            // Unassign logic - might need clarification if they want to remove ALL or just one
            // Here we just clear the primary and we'd need a specific user to disconnect from M2M
        }

        const count = customersToUpdate.length;

        if (assignedToUserId && count > 0) {
            await createNotification({
                userId: assignedToUserId,
                title: 'Bulk Customer Assignment',
                message: `${count} new customers have been assigned to you.`,
                type: 'INFO',
                link: '/dashboard/customers'
            });
        }

        await prisma.auditLog.create({
            data: {
                userId: decoded.id,
                action: 'bulk_assign',
                entity: 'customer_profile',
                entityId: 'bulk',
                changes: JSON.stringify({ filters, assignedToUserId, count: count })
            }
        });

        return NextResponse.json({ message: 'Assignment complete', count: count });

    } catch (error: any) {
        console.error('Bulk Assign Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
