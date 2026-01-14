import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';
import prisma from '@/lib/prisma';

// GET - Fetch plagiarism reports
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
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
        if (user.role === 'PLAGIARISM_CHECKER') {
            where.checkedBy = user.id;
        } else if (user.role === 'JOURNAL_MANAGER') {
            // Get journals managed by this user
            const managedJournals = await prisma.journal.findMany({
                where: { journalManagerId: user.id },
                select: { id: true }
            });
            where.journalId = { in: managedJournals.map(j => j.id) };
        }

        if (status) where.status = status;
        if (journalId) where.journalId = journalId;
        if (pending) where.status = 'PENDING';

        const reports = await prisma.plagiarismReport.findMany({
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
        console.error('Error fetching plagiarism reports:', error);
        return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
    }
}

// POST - Create or update plagiarism report
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        if (!['SUPER_ADMIN', 'ADMIN', 'JOURNAL_MANAGER', 'PLAGIARISM_CHECKER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { articleId, journalId, status, similarityScore, toolUsed, reportUrl, comments } = body;

        if (!articleId || !journalId) {
            return NextResponse.json({ error: 'Article ID and Journal ID are required' }, { status: 400 });
        }

        // Verify article exists
        const article = await prisma.article.findUnique({
            where: { id: articleId }
        });

        if (!article) {
            return NextResponse.json({ error: 'Article not found' }, { status: 404 });
        }

        const report = await prisma.plagiarismReport.upsert({
            where: { articleId },
            update: {
                status: status || 'IN_PROGRESS',
                similarityScore,
                toolUsed,
                reportUrl,
                comments,
                checkedDate: new Date(),
                checkedBy: user.id
            },
            create: {
                articleId,
                journalId,
                checkedBy: user.id,
                status: status || 'PENDING',
                similarityScore,
                toolUsed,
                reportUrl,
                comments
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

        // Update article manuscript status if plagiarism check is complete
        if (status === 'PASSED') {
            await prisma.article.update({
                where: { id: articleId },
                data: { manuscriptStatus: 'UNDER_REVIEW' }
            });

            // Create status history
            await prisma.manuscriptStatusHistory.create({
                data: {
                    articleId,
                    fromStatus: 'PLAGIARISM_CHECK',
                    toStatus: 'UNDER_REVIEW',
                    changedBy: user.id,
                    reason: 'Plagiarism check passed',
                    comments: `Similarity score: ${similarityScore}%`
                }
            });
        } else if (status === 'FAILED') {
            await prisma.article.update({
                where: { id: articleId },
                data: { manuscriptStatus: 'REVISION_REQUIRED' }
            });

            await prisma.manuscriptStatusHistory.create({
                data: {
                    articleId,
                    fromStatus: 'PLAGIARISM_CHECK',
                    toStatus: 'REVISION_REQUIRED',
                    changedBy: user.id,
                    reason: 'Plagiarism check failed',
                    comments: `Similarity score: ${similarityScore}%`
                }
            });
        }

        return NextResponse.json(report, { status: 201 });
    } catch (error: any) {
        console.error('Error creating plagiarism report:', error);
        return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
    }
}
