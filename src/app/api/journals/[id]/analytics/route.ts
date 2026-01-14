import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/nextauth';
import prisma from '@/lib/prisma';

// GET - Journal analytics and performance metrics
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const journalId = params.id;

        // Get journal details
        const journal = await prisma.journal.findUnique({
            where: { id: journalId },
            include: {
                domain: true,
                publisher: true,
                journalManager: {
                    select: {
                        id: true,
                        email: true,
                        name: true
                    }
                },
                indexings: true,
                _count: {
                    select: {
                        articles: true,
                        editorialBoard: true,
                        volumes: true
                    }
                }
            }
        });

        if (!journal) {
            return NextResponse.json({ error: 'Journal not found' }, { status: 404 });
        }

        // Get manuscript statistics
        const manuscriptStats = await prisma.article.groupBy({
            by: ['manuscriptStatus'],
            where: { journalId },
            _count: true
        });

        // Get acceptance rate
        const totalSubmissions = await prisma.article.count({
            where: { journalId }
        });

        const acceptedCount = await prisma.article.count({
            where: {
                journalId,
                manuscriptStatus: { in: ['ACCEPTED', 'PUBLISHED'] }
            }
        });

        const acceptanceRate = totalSubmissions > 0
            ? (acceptedCount / totalSubmissions) * 100
            : 0;

        // Get plagiarism statistics
        const plagiarismStats = await prisma.plagiarismReport.groupBy({
            by: ['status'],
            where: { journalId },
            _count: true,
            _avg: {
                similarityScore: true
            }
        });

        // Get quality statistics
        const qualityStats = await prisma.qualityReport.groupBy({
            by: ['status'],
            where: { journalId },
            _count: true,
            _avg: {
                overallScore: true,
                formattingScore: true,
                languageScore: true,
                structureScore: true
            }
        });

        // Get monthly submission trends (last 12 months)
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const monthlySubmissions = await prisma.$queryRaw`
            SELECT 
                DATE_TRUNC('month', "submissionDate") as month,
                COUNT(*) as count
            FROM "Article"
            WHERE "journalId" = ${journalId}
            AND "submissionDate" >= ${twelveMonthsAgo}
            GROUP BY month
            ORDER BY month DESC
        `;

        // Get average processing time
        const processingTimes = await prisma.article.findMany({
            where: {
                journalId,
                manuscriptStatus: { in: ['ACCEPTED', 'PUBLISHED'] },
                acceptanceDate: { not: null }
            },
            select: {
                submissionDate: true,
                acceptanceDate: true
            }
        });

        const avgProcessingDays = processingTimes.length > 0
            ? processingTimes.reduce((sum, article) => {
                const days = Math.floor(
                    (article.acceptanceDate!.getTime() - article.submissionDate.getTime())
                    / (1000 * 60 * 60 * 24)
                );
                return sum + days;
            }, 0) / processingTimes.length
            : 0;

        // Get editorial board performance
        const editorialBoardCount = await prisma.editorialBoardMember.count({
            where: { journalId, isActive: true }
        });

        const editorialBoardByRole = await prisma.editorialBoardMember.groupBy({
            by: ['role'],
            where: { journalId, isActive: true },
            _count: true
        });

        return NextResponse.json({
            journal: {
                id: journal.id,
                name: journal.name,
                domain: journal.domain,
                publisher: journal.publisher,
                indexings: journal.indexings,
                impactFactor: journal.impactFactor,
                hIndex: journal.hIndex,
                citationScore: journal.citationScore,
                manager: journal.journalManager,
                counts: journal._count
            },
            metrics: {
                totalSubmissions,
                acceptedCount,
                acceptanceRate: Math.round(acceptanceRate * 100) / 100,
                avgProcessingDays: Math.round(avgProcessingDays),
                editorialBoardCount
            },
            manuscriptStats: manuscriptStats.reduce((acc, item) => {
                acc[item.manuscriptStatus || 'UNKNOWN'] = item._count;
                return acc;
            }, {} as Record<string, number>),
            plagiarismStats: {
                byStatus: plagiarismStats,
                avgSimilarityScore: plagiarismStats.reduce((sum, s) =>
                    sum + (s._avg.similarityScore || 0), 0
                ) / (plagiarismStats.length || 1)
            },
            qualityStats: {
                byStatus: qualityStats,
                avgScores: {
                    overall: qualityStats.reduce((sum, s) =>
                        sum + (s._avg.overallScore || 0), 0
                    ) / (qualityStats.length || 1),
                    formatting: qualityStats.reduce((sum, s) =>
                        sum + (s._avg.formattingScore || 0), 0
                    ) / (qualityStats.length || 1),
                    language: qualityStats.reduce((sum, s) =>
                        sum + (s._avg.languageScore || 0), 0
                    ) / (qualityStats.length || 1),
                    structure: qualityStats.reduce((sum, s) =>
                        sum + (s._avg.structureScore || 0), 0
                    ) / (qualityStats.length || 1)
                }
            },
            trends: {
                monthlySubmissions
            },
            editorialBoard: {
                total: editorialBoardCount,
                byRole: editorialBoardByRole
            }
        });
    } catch (error) {
        console.error('Error fetching journal analytics:', error);
        return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }
}
