import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

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
        const headers = [
            'ID', 'Name', 'Abbreviation', 'ISSN Print', 'ISSN Online', 'Frequency', 'Active', 'Plans Count',
            'Subscription Price INR', 'Subscription Price USD',
            'APC Open Access INR', 'APC Open Access USD',
            'APC Rapid INR', 'APC Rapid USD',
            'APC WoS INR', 'APC WoS USD',
            'APC Other INR', 'APC Other USD'
        ];
        const rows = journals.map(j => [
            j.id,
            j.name,
            j.abbreviation || '',
            j.issnPrint || 'N/A',
            j.issnOnline || 'N/A',
            j.frequency,
            j.isActive ? 'Yes' : 'No',
            j.plans.length,
            j.priceINR,
            j.priceUSD,
            j.apcOpenAccessINR,
            j.apcOpenAccessUSD,
            j.apcRapidINR,
            j.apcRapidUSD,
            j.apcWoSINR,
            j.apcWoSUSD,
            j.apcOtherINR,
            j.apcOtherUSD
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
