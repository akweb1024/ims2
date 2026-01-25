import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function POST(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        // Allow CUSTOMER or EDITOR/AUTHOR to submit (adjust as per requirements, strictly CUSTOMER here)
        if (!decoded || !['CUSTOMER', 'AUTHOR'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden. Only authors/customers can submit articles.' }, { status: 403 });
        }

        const body = await req.json();
        const { title, abstract, keywords, journalId, apcType, fileUrl } = body;

        if (!title || !journalId || !fileUrl) {
            return NextResponse.json({ error: 'Missing Required Fields' }, { status: 400 });
        }

        // 1. Get Journal & Verify APC
        const journal = await prisma.journal.findUnique({
            where: { id: journalId }
        });

        if (!journal || !journal.isActive) {
            return NextResponse.json({ error: 'Journal not found or inactive' }, { status: 404 });
        }

        let apcAmount = 0;
        // Assuming INR for simplicity in this logic, or handle currency based on user preference
        // In real app, we might check user's region or preferred currency
        const useUSD = false;

        if (apcType) {
            switch (apcType) {
                case 'OPEN_ACCESS':
                    apcAmount = useUSD ? journal.apcOpenAccessUSD : journal.apcOpenAccessINR;
                    break;
                case 'RAPID':
                    apcAmount = useUSD ? journal.apcRapidUSD : journal.apcRapidINR;
                    break;
                case 'WOS':
                    apcAmount = useUSD ? journal.apcWoSUSD : journal.apcWoSINR;
                    break;
                case 'OTHER':
                    apcAmount = useUSD ? journal.apcOtherUSD : journal.apcOtherINR;
                    break;
                default:
                    // If invalid type provided, ignore or error. 
                    break;
            }
        }

        // Fetch User Name
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { name: true }
        });
        const authorName = user?.name || 'Unknown Author';

        // 2. Create Article
        const article = await prisma.article.create({
            data: {
                title,
                abstract,
                keywords,
                journalId,
                status: 'SUBMITTED',
                fileUrl,
                submissionDate: new Date(),
                apcType: apcType || null,
                apcAmountINR: !useUSD ? apcAmount : 0,
                apcAmountUSD: useUSD ? apcAmount : 0,
                apcPaymentStatus: apcAmount > 0 ? 'UNPAID' : 'NOT_APPLICABLE',
                authors: {
                    create: {
                        name: authorName,
                        email: decoded.email,
                        isCorresponding: true,
                        userId: decoded.id
                    }
                },
                // Initial Manuscript Status
                manuscriptStatus: 'SUBMITTED',
                statusHistory: {
                    create: {
                        toStatus: 'SUBMITTED',
                        changedBy: decoded.id,
                        comments: 'Initial submission by author'
                    }
                }
            }
        });

        // 3. (Optional) Generate Invoice if APC > 0
        if (apcAmount > 0) {
            // This logic can be expanded. For now we just mark it as UNPAID in the article.
            // A separate invoicing flow would handle the actual billing.
        }

        return NextResponse.json({ success: true, articleId: article.id });

    } catch (error: any) {
        console.error('Article Submission Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
