import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function POST(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'MANAGER'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { data } = await req.json(); // Array of journal objects

        if (!Array.isArray(data)) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
        }

        let createdCount = 0;
        let skippedCount = 0;

        for (const rawItem of data) {
            // Normalizing keys: "ISSN Print" -> "issnprint"
            const item: any = {};
            Object.keys(rawItem).forEach(key => {
                item[key.toLowerCase().replace(/\s/g, '')] = rawItem[key];
            });

            // Handle optional abbreviation safely
            const abbreviation = item.abbreviation ? String(item.abbreviation).trim() : null;

            const name = item.name || item.journalname;
            if (!name) {
                skippedCount++;
                continue;
            }

            // Check if journal with same name or ISSN already exists
            const existing = await prisma.journal.findFirst({
                where: {
                    OR: [
                        { name: { equals: name, mode: 'insensitive' } },
                        { abbreviation: abbreviation && abbreviation !== 'N/A' ? { equals: abbreviation, mode: 'insensitive' } : undefined },
                        { issnPrint: item.issnprint && item.issnprint !== 'N/A' ? { equals: item.issnprint } : undefined },
                        { issnOnline: item.issnonline && item.issnonline !== 'N/A' ? { equals: item.issnonline } : undefined }
                    ].filter(Boolean) as any
                }
            });

            if (existing) {
                skippedCount++;
                continue;
            }

            await prisma.journal.create({
                data: {
                    name: name,
                    issnPrint: item.issnprint === 'N/A' || !item.issnprint ? null : item.issnprint,
                    issnOnline: item.issnonline === 'N/A' || !item.issnonline ? null : item.issnonline,
                    frequency: item.frequency || 'Monthly',
                    priceINR: parseFloat(String(item.subscriptionpriceinr || item.priceinr || '0').replace(/[^0-9.]/g, '')) || 0,
                    priceUSD: parseFloat(String(item.subscriptionpriceusd || item.priceusd || '0').replace(/[^0-9.]/g, '')) || 0,
                    isActive: true,
                    abbreviation,
                    apcOpenAccessINR: parseFloat(String(item.apcopenaccessinr || '0').replace(/[^0-9.]/g, '')) || 0,
                    apcOpenAccessUSD: parseFloat(String(item.apcopenaccessusd || '0').replace(/[^0-9.]/g, '')) || 0,
                    apcRapidINR: parseFloat(String(item.apcrapidinr || '0').replace(/[^0-9.]/g, '')) || 0,
                    apcRapidUSD: parseFloat(String(item.apcrapidusd || '0').replace(/[^0-9.]/g, '')) || 0,
                    apcWoSINR: parseFloat(String(item.apcwosinr || '0').replace(/[^0-9.]/g, '')) || 0,
                    apcWoSUSD: parseFloat(String(item.apcwosusd || '0').replace(/[^0-9.]/g, '')) || 0,
                    apcOtherINR: parseFloat(String(item.apcotherinr || '0').replace(/[^0-9.]/g, '')) || 0,
                    apcOtherUSD: parseFloat(String(item.apcotherusd || '0').replace(/[^0-9.]/g, '')) || 0
                }
            });
            createdCount++;
        }

        return NextResponse.json({
            success: true,
            message: `Successfully imported ${createdCount} journals. ${skippedCount} items skipped (already exist).`
        });

    } catch (error: any) {
        console.error('Import Error:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error.message
        }, { status: 500 });
    }
}
