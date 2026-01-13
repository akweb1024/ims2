import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Build where clause based on role
        let where: any = {};

        if (decoded.role === 'CUSTOMER') {
            // Customers can only see themselves
            where.userId = decoded.id;
        } else if (['SUPER_ADMIN', 'ADMIN'].includes(decoded.role)) {
            // Admins can see all customers in their company
            if (decoded.companyId) {
                where.companyId = decoded.companyId;
            }
        } else if (['MANAGER', 'TEAM_LEADER', 'EXECUTIVE'].includes(decoded.role)) {
            // Employees can see customers assigned to them
            where.OR = [
                { assignedToUserId: decoded.id },
                {
                    assignedExecutives: {
                        some: { id: decoded.id }
                    }
                }
            ];
        }

        const customers = await prisma.customerProfile.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        return NextResponse.json(customers);
    } catch (error: any) {
        console.error('Customers for Chat GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
