import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { transactions } = await req.json(); // Array of { date, amount, description }
        const companyId = user.companyId;
        if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 400 });

        const results = [];

        for (const txn of transactions) {
            const txnDate = new Date(txn.date);
            const txnAmount = parseFloat(txn.amount);

            // Define Match Window (+/- 5 days)
            const startDate = new Date(txnDate);
            startDate.setDate(startDate.getDate() - 5);
            const endDate = new Date(txnDate);
            endDate.setDate(endDate.getDate() + 5);

            // Determine if Inflow or Outflow
            // Bank CSV: Inflow usually positive, Outflow negative.
            // Ledger: Inflow to Bank (Asset) is DEBIT. Outflow is CREDIT.
            // So if txnAmount > 0 (Inflow), find DEBIT ~ txnAmount
            // If txnAmount < 0 (Outflow), find CREDIT ~ abs(txnAmount)

            const isDebit = txnAmount > 0;
            const absAmount = Math.abs(txnAmount);

            // Find candidates
            const candidates = await prisma.journalLine.findMany({
                where: {
                    account: {
                        code: '1000',
                        companyId
                    },
                    debit: isDebit ? { gte: absAmount - 0.1, lte: absAmount + 0.1 } : 0,
                    credit: !isDebit ? { gte: absAmount - 0.1, lte: absAmount + 0.1 } : 0,
                    journalEntry: {
                        date: { gte: startDate, lte: endDate },
                        status: 'POSTED' // Only match against open/posted entries? Or RECONCILED too? Assume we want to check duplication?
                        // For now, let's just find ANY match.
                    }
                },
                include: {
                    journalEntry: true
                }
            });

            if (candidates.length > 0) {
                // Pick best match (closest date)
                const best = candidates.sort((a, b) => {
                    const diffA = Math.abs(new Date(a.journalEntry.date).getTime() - txnDate.getTime());
                    const diffB = Math.abs(new Date(b.journalEntry.date).getTime() - txnDate.getTime());
                    return diffA - diffB;
                })[0];

                results.push({
                    ...txn,
                    status: 'MATCHED',
                    matchConfidence: 90, // Arbitrary high score
                    suggestedMatch: {
                        id: best.journalEntry.id,
                        reference: best.journalEntry.reference || best.description,
                        date: best.journalEntry.date,
                        source: 'SYSTEM'
                    }
                });
            } else {
                results.push({
                    ...txn,
                    status: 'UNMATCHED',
                    matchConfidence: 0
                });
            }
        }

        return NextResponse.json(results);

    } catch (error: any) {
        console.error('Reconciliation Match Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
