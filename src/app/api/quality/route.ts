import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/nextauth';
import prisma from '@/lib/prisma';

// GET - Fetch quality reports
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const journalId = searchParams.get('journalId');
        const pending = searchParams.get('pending') === 'true';

        const where: any = {};

        // Role-based filtering
        if (user.role === 'QUALITY_CHECKER') {
            where.checkedBy = user.id;
        } else if (user.role === 'JOURNAL_MANAGER') {
            const managedJournals = await prisma.journal.findMany({
                where: { journalManagerId: user.id },
                select: { id: true }
            });
            where.journalId = { in: managedJournals.map(j => j.id) };
        }

        if (status) where.status = status;
        if (journalId) where.journalId = journalId;
        if (pending) where.status = 'PENDING';

        const reports = await prisma.qualityReport.findMany({
            where,
            include: {
                article: {
                    select: {
                        id: true,
                        title: true,
                        manuscriptId: true,
                        submissionDate: true
                    }
                },
                journal: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                checker: {
                    select: {
                        id: true,
                        email: true,
                        name: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(reports);
    } catch (error) {
        console.error('Error fetching quality reports:', error);
        return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
    }
}

// POST - Create or update quality report
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        if (!['SUPER_ADMIN', 'ADMIN', 'JOURNAL_MANAGER', 'QUALITY_CHECKER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const {
            articleId,
            journalId,
            status,
            formattingScore,
            languageScore,
            structureScore,
            comments,
            issues
        } = body;

        if (!articleId || !journalId) {
            return NextResponse.json({ error: 'Article ID and Journal ID are required' }, { status: 400 });
        }

        // Calculate overall score
        const scores = [formattingScore, languageScore, structureScore].filter(s => s !== undefined && s !== null);
        const overallScore = scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : undefined;

        const report = await prisma.qualityReport.upsert({
            where: { articleId },
            update: {
                status: status || 'IN_PROGRESS',
                formattingScore,
                languageScore,
                structureScore,
                overallScore,
                comments,
                issues: issues || [],
                checkedDate: new Date(),
                checkedBy: user.id
            },
            create: {
                articleId,
                journalId,
                checkedBy: user.id,
                status: status || 'PENDING',
                formattingScore,
                languageScore,
                structureScore,
                overallScore,
                comments,
                issues: issues || []
            },
            include: {
                article: {
                    select: {
                        id: true,
                        title: true,
                        manuscriptId: true
                    }
                }
            }
        });

        // Update article manuscript status if quality check is complete
        if (status === 'APPROVED') {
            await prisma.article.update({
                where: { id: articleId },
                data: { manuscriptStatus: 'ACCEPTED' }
            });

            await prisma.manuscriptStatusHistory.create({
                data: {
                    articleId,
                    fromStatus: 'QUALITY_CHECK',
                    toStatus: 'ACCEPTED',
                    changedBy: user.id,
                    reason: 'Quality check approved',
                    comments: `Overall score: ${overallScore}/10`
                }
            });
        } else if (status === 'REJECTED' || status === 'REQUIRES_FORMATTING') {
            await prisma.article.update({
                where: { id: articleId },
                data: { manuscriptStatus: 'REVISION_REQUIRED' }
            });

            await prisma.manuscriptStatusHistory.create({
                data: {
                    articleId,
                    fromStatus: 'QUALITY_CHECK',
                    toStatus: 'REVISION_REQUIRED',
                    changedBy: user.id,
                    reason: status === 'REJECTED' ? 'Quality check rejected' : 'Formatting issues found',
                    comments: comments || `Issues: ${issues?.join(', ')}`
                }
            });
        }

        return NextResponse.json(report, { status: 201 });
    } catch (error: any) {
        console.error('Error creating quality report:', error);
        return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
    }
}

// GET - Statistics
export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        const { searchParams } = new URL(req.url);
        const journalId = searchParams.get('journalId');

        const where: any = {};
        if (journalId) where.journalId = journalId;

        const stats = await prisma.qualityReport.groupBy({
            by: ['status'],
            where,
            _count: true,
            _avg: {
                overallScore: true
            }
        });

        return NextResponse.json(stats);
    } catch (error) {
        console.error('Error fetching quality statistics:', error);
        return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 });
    }
}
