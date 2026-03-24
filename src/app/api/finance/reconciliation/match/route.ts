import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

type IncomingTransaction = {
    id?: string;
    date: string;
    description: string;
    amount: number | string;
};

type MatchCandidate = {
    status: 'MATCHED' | 'UNMATCHED';
    matchConfidence: number;
    suggestedMatch?: {
        id: string;
        reference: string;
        date: Date;
        source: string;
    };
};

async function analyzeTransaction(companyId: string, txn: IncomingTransaction): Promise<MatchCandidate> {
    const txnDate = new Date(txn.date);
    const txnAmount = parseFloat(String(txn.amount));

    const startDate = new Date(txnDate);
    startDate.setDate(startDate.getDate() - 5);
    const endDate = new Date(txnDate);
    endDate.setDate(endDate.getDate() + 5);

    const isDebit = txnAmount > 0;
    const absAmount = Math.abs(txnAmount);

    const candidates = await prisma.journalLine.findMany({
        where: {
            account: {
                code: '1000',
                companyId,
            },
            debit: isDebit ? { gte: absAmount - 0.1, lte: absAmount + 0.1 } : 0,
            credit: !isDebit ? { gte: absAmount - 0.1, lte: absAmount + 0.1 } : 0,
            journalEntry: {
                date: { gte: startDate, lte: endDate },
                status: { in: ['POSTED', 'RECONCILED'] },
            },
        },
        include: {
            journalEntry: true,
        },
    });

    if (candidates.length === 0) {
        return {
            status: 'UNMATCHED',
            matchConfidence: 0,
        };
    }

    const best = candidates.sort((a, b) => {
        const diffA = Math.abs(new Date(a.journalEntry.date).getTime() - txnDate.getTime());
        const diffB = Math.abs(new Date(b.journalEntry.date).getTime() - txnDate.getTime());
        return diffA - diffB;
    })[0];

    return {
        status: 'MATCHED',
        matchConfidence: 90,
        suggestedMatch: {
            id: best.journalEntry.id,
            reference: best.journalEntry.reference || best.description || best.journalEntry.entryNumber,
            date: best.journalEntry.date,
            source: 'SYSTEM',
        },
    };
}

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!user.companyId) return NextResponse.json({ error: 'No company' }, { status: 400 });

        const { transactions, sourceFileName } = await req.json();
        if (!Array.isArray(transactions) || transactions.length === 0) {
            return NextResponse.json({ error: 'Transactions are required' }, { status: 400 });
        }

        const analyzed = await Promise.all(
            transactions.map(async (txn: IncomingTransaction, index: number) => {
                const match = await analyzeTransaction(user.companyId!, txn);
                const signedAmount = parseFloat(String(txn.amount));

                return {
                    id: txn.id || `line-${index + 1}`,
                    date: txn.date,
                    description: txn.description,
                    amount: signedAmount,
                    type: signedAmount >= 0 ? 'CREDIT' : 'DEBIT',
                    ...match,
                };
            })
        );

        const summary = analyzed.reduce(
            (acc, item) => {
                if (item.status === 'MATCHED') {
                    acc.pendingCount += 1;
                } else {
                    acc.unmatchedCount += 1;
                }
                return acc;
            },
            { pendingCount: 0, unmatchedCount: 0 }
        );

        const session = await (prisma as any).bankReconciliationSession.create({
            data: {
                companyId: user.companyId,
                uploadedByUserId: user.id,
                sourceFileName: typeof sourceFileName === 'string' ? sourceFileName : null,
                sourceType: 'CSV',
                status: summary.pendingCount > 0 ? 'PENDING_REVIEW' : 'ANALYZED',
                totalTransactions: analyzed.length,
                matchedCount: 0,
                pendingCount: summary.pendingCount,
                unmatchedCount: summary.unmatchedCount,
                lines: {
                    create: analyzed.map((item, index) => ({
                        lineNumber: index + 1,
                        externalId: item.id,
                        transactionDate: new Date(item.date),
                        description: item.description,
                        amount: item.amount,
                        transactionType: item.type,
                        status: item.status === 'MATCHED' ? 'PENDING' : 'UNMATCHED',
                        matchConfidence: item.matchConfidence,
                        journalEntryId: item.suggestedMatch?.id,
                        rawData: item,
                    })),
                },
            },
            include: {
                lines: {
                    include: {
                        journalEntry: true,
                    },
                    orderBy: { lineNumber: 'asc' },
                },
            },
        });

        const responseTransactions = session.lines.map((line: any) => ({
            id: line.id,
            externalId: line.externalId,
            date: line.transactionDate,
            description: line.description,
            amount: Math.abs(line.amount),
            signedAmount: line.amount,
            type: line.transactionType,
            status: line.status,
            matchConfidence: line.matchConfidence || 0,
            suggestedMatch: line.journalEntry
                ? {
                    id: line.journalEntry.id,
                    reference: line.journalEntry.reference || line.journalEntry.entryNumber,
                    date: line.journalEntry.date,
                    source: 'SYSTEM',
                }
                : undefined,
        }));

        return NextResponse.json({
            session: {
                id: session.id,
                sourceFileName: session.sourceFileName,
                status: session.status,
                totalTransactions: session.totalTransactions,
                matchedCount: session.matchedCount,
                pendingCount: session.pendingCount,
                unmatchedCount: session.unmatchedCount,
                createdAt: session.createdAt,
            },
            transactions: responseTransactions,
        });
    } catch (error: any) {
        console.error('Reconciliation Match Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
