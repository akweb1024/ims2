import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { FinanceService } from '@/lib/services/finance';

export async function GET(req: NextRequest) {
    try {
        const company = await prisma.company.findFirst();
        if (!company) return NextResponse.json({ error: 'No company' }, { status: 404 });

        const entries = await prisma.journalEntry.findMany({
            where: { companyId: company.id },
            include: { lines: true },
            orderBy: { date: 'desc' }
        });

        return NextResponse.json(entries);
    } catch (error) {
        console.error('Error fetching journal entries:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const data = await req.json();
        const company = await prisma.company.findFirst();
        if (!company) return NextResponse.json({ error: 'No company' }, { status: 404 });

        // Validate data
        if (!data.date || !data.description || !data.lines || data.lines.length < 2) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        const entry = await FinanceService.createJournalEntry(company.id, {
            date: new Date(data.date),
            description: data.description,
            reference: data.reference,
            lines: data.lines
        });

        return NextResponse.json(entry);
    } catch (error: any) {
        console.error('Error creating journal entry:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
