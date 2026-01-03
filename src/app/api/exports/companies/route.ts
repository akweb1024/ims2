import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || decoded.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const companies = await prisma.company.findMany({
            include: {
                _count: {
                    select: { users: true, customers: true, subscriptions: true }
                }
            },
            orderBy: { name: 'asc' }
        });

        // Generate CSV
        const headers = ['ID', 'Name', 'Domain', 'Email', 'Phone', 'Currency', 'Users', 'Customers', 'Subscriptions', 'Created At'];
        const rows = companies.map(c => [
            c.id,
            c.name,
            c.domain || 'N/A',
            c.email || 'N/A',
            c.phone || 'N/A',
            c.currency,
            c._count.users,
            c._count.customers,
            c._count.subscriptions,
            c.createdAt.toISOString()
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="companies-export-${Date.now()}.csv"`
            }
        });

    } catch (error: any) {
        console.error('Export Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
