import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'MANAGER'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const journals = await prisma.journal.findMany({
            include: {
                plans: true
            },
            orderBy: { name: 'asc' }
        });

        // Generate CSV
        const headers = ['ID', 'Name', 'ISSN Print', 'ISSN Online', 'Frequency', 'Price INR', 'Price USD', 'Active', 'Plans Count'];
        const rows = journals.map(j => [
            j.id,
            j.name,
            j.issnPrint || 'N/A',
            j.issnOnline || 'N/A',
            j.frequency,
            j.priceINR,
            j.priceUSD,
            j.isActive ? 'Yes' : 'No',
            j.plans.length
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="journals-export-${Date.now()}.csv"`
            }
        });

    } catch (error: any) {
        console.error('Export Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
