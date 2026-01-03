import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const customers = await prisma.customerProfile.findMany({
            where: decoded.role === 'SUPER_ADMIN' ? {} : { companyId: decoded.companyId },
            include: {
                user: {
                    select: {
                        email: true,
                        role: true,
                        isActive: true,
                        lastLogin: true
                    }
                },
                _count: {
                    select: {
                        subscriptions: true,
                        communications: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Generate CSV
        const headers = [
            'ID', 'Name', 'Primary Email', 'Customer Type', 'Organization',
            'Phone', 'Country', 'State', 'City', 'Active', 'Last Login',
            'Subscriptions Count', 'Comms Count'
        ];

        const rows = customers.map(c => [
            c.id,
            c.name,
            c.primaryEmail,
            c.customerType,
            c.organizationName || 'N/A',
            c.primaryPhone || 'N/A',
            c.country || 'N/A',
            c.state || 'N/A',
            c.city || 'N/A',
            c.user?.isActive ? 'Yes' : 'No',
            c.user?.lastLogin ? new Date(c.user.lastLogin).toISOString() : 'Never',
            c._count.subscriptions,
            c._count.communications
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="customers-export-${Date.now()}.csv"`
            }
        });

    } catch (error: any) {
        console.error('Customer Export Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
