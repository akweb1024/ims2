import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(req: NextRequest) {
    try {
        // 1. Verify Authentication
        const decoded = await getAuthenticatedUser();
        if (!decoded) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // 2. Parse Query Parameters
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const category = searchParams.get('category') || '';
        const limit = parseInt(searchParams.get('limit') || '50');

        // 3. Query Journals
        const where: any = {
            isActive: true,
            AND: [
                search ? {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { issnPrint: { contains: search, mode: 'insensitive' } },
                        { issnOnline: { contains: search, mode: 'insensitive' } }
                    ]
                } : {},
                category ? { subjectCategory: { contains: category } } : {}
            ]
        };

        if (decoded.role === 'EDITOR') {
            where.editorId = decoded.id;
        }

        const journals = await prisma.journal.findMany({
            where,
            include: {
                plans: {
                    where: { isActive: true }
                }
            },
            take: limit,
            orderBy: { name: 'asc' }
        });

        return NextResponse.json(journals);

    } catch (error: any) {
        console.error('Journal API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        // 1. Verify Authentication & Role
        const decoded = await getAuthenticatedUser();
        if (!decoded || decoded.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. Parse Body
        const body = await req.json();
        const {
            name, issnPrint, issnOnline, frequency, formatAvailable, subjectCategory,
            priceINR, priceUSD, plans, editorId,
            apcOpenAccessINR, apcOpenAccessUSD,
            apcRapidINR, apcRapidUSD,
            apcWoSINR, apcWoSUSD,
            apcOtherINR, apcOtherUSD
        } = body;

        // 3. Create Journal and Plans
        const journal = await prisma.journal.create({
            data: {
                name,
                issnPrint,
                issnOnline,
                frequency,
                formatAvailable,
                subjectCategory,
                priceINR: parseFloat(priceINR || '0'),
                priceUSD: parseFloat(priceUSD || '0'),
                editorId,
                apcOpenAccessINR: parseFloat(apcOpenAccessINR || '0'),
                apcOpenAccessUSD: parseFloat(apcOpenAccessUSD || '0'),
                apcRapidINR: parseFloat(apcRapidINR || '0'),
                apcRapidUSD: parseFloat(apcRapidUSD || '0'),
                apcWoSINR: parseFloat(apcWoSINR || '0'),
                apcWoSUSD: parseFloat(apcWoSUSD || '0'),
                apcOtherINR: parseFloat(apcOtherINR || '0'),
                apcOtherUSD: parseFloat(apcOtherUSD || '0'),
                plans: {
                    create: (plans || []).map((plan: any) => ({
                        planType: plan.planType,
                        format: plan.format,
                        duration: parseInt(plan.duration),
                        priceINR: parseFloat(plan.priceINR || '0'),
                        priceUSD: parseFloat(plan.priceUSD || '0'),
                        startDateRule: plan.startDateRule || 'immediate',
                        isActive: true
                    }))
                }
            },
            include: {
                plans: true
            }
        });

        // 4. Log Audit
        await prisma.auditLog.create({
            data: {
                userId: decoded.id,
                action: 'create',
                entity: 'journal',
                entityId: journal.id,
                changes: JSON.stringify(body)
            }
        });

        return NextResponse.json(journal);

    } catch (error: any) {
        console.error('Journal Create Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
