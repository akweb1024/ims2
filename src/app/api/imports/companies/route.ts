import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || decoded.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { data } = await req.json();

        if (!Array.isArray(data)) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
        }

        let createdCount = 0;
        let skippedCount = 0;

        for (const rawItem of data) {
            // Normalizing keys
            const item: any = {};
            Object.keys(rawItem).forEach(key => {
                item[key.toLowerCase().replace(/\s/g, '')] = rawItem[key];
            });

            const name = item.name;
            if (!name) {
                skippedCount++;
                continue;
            }

            const existing = await prisma.company.findFirst({
                where: { name: name }
            });

            if (existing) {
                skippedCount++;
                continue;
            }

            await prisma.company.create({
                data: {
                    name: name,
                    domain: item.domain === 'N/A' || !item.domain ? null : item.domain,
                    email: item.email === 'N/A' || !item.email ? null : item.email,
                    phone: item.phone === 'N/A' || !item.phone ? null : item.phone,
                    currency: item.currency || 'INR'
                }
            });
            createdCount++;
        }

        return NextResponse.json({
            success: true,
            message: `Successfully imported ${createdCount} companies. ${skippedCount} items skipped (already exist).`
        });

    } catch (error: any) {
        console.error('Import Error:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error.message
        }, { status: 500 });
    }
}
