import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';
import prisma from '@/lib/prisma';

// GET - Manuscript workflow dashboard
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        const { searchParams } = new URL(req.url);
        const journalId = searchParams.get('journalId');

        // Build where clause based on role
        const where: any = {};

        if (user.role === 'JOURNAL_MANAGER') {
            // Get journals managed by this user
            const managedJournals = await prisma.journal.findMany({
                where: { journalManagerId: user.id },
                select: { id: true }
            });
            where.journalId = { in: managedJournals.map(j => j.id) };
        } else if (journalId) {
            where.journalId = journalId;
        }

        // Get manuscript counts by status
        const statusCounts = await prisma.article.groupBy({
            by: ['manuscriptStatus'],
            where,
            _count: true
        });

        // Get pending plagiarism checks
        const pendingPlagiarism = await prisma.plagiarismReport.count({
            where: {
                status: 'PENDING',
                ...(journalId && { journalId })
            }
        });

        // Get pending quality checks
        const pendingQuality = await prisma.qualityReport.count({
            where: {
                status: 'PENDING',
                ...(journalId && { journalId })
            }
        });

        // Get recent manuscripts
        const recentManuscripts = await prisma.article.findMany({
            where,
            take: 10,
            orderBy: { submissionDate: 'desc' },
            select: {
                id: true,
                title: true,
                manuscriptId: true,
                manuscriptStatus: true,
                submissionDate: true,
                journal: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        // Calculate average processing time
        const completedManuscripts = await prisma.article.findMany({
            where: {
                ...where,
                manuscriptStatus: { in: ['ACCEPTED', 'PUBLISHED'] },
                acceptanceDate: { not: null }
            },
            select: {
                submissionDate: true,
                acceptanceDate: true
            }
        });

        const avgProcessingTime = completedManuscripts.length > 0
            ? completedManuscripts.reduce((sum, m) => {
                const days = Math.floor(
                    (m.acceptanceDate!.getTime() - m.submissionDate.getTime()) / (1000 * 60 * 60 * 24)
                );
                return sum + days;
            }, 0) / completedManuscripts.length
            : 0;

        // Get team performance
        const plagiarismTeamPerformance = await prisma.plagiarismReport.groupBy({
            by: ['status'],
            where: journalId ? { journalId } : {},
            _count: true
        });

        const qualityTeamPerformance = await prisma.qualityReport.groupBy({
            by: ['status'],
            where: journalId ? { journalId } : {},
            _count: true,
            _avg: {
                overallScore: true
            }
        });

        return NextResponse.json({
            statusCounts: statusCounts.reduce((acc, item) => {
                acc[item.manuscriptStatus || 'UNKNOWN'] = item._count;
                return acc;
            }, {} as Record<string, number>),
            pendingPlagiarism,
            pendingQuality,
            recentManuscripts,
            avgProcessingTime: Math.round(avgProcessingTime),
            teamPerformance: {
                plagiarism: plagiarismTeamPerformance,
                quality: qualityTeamPerformance
            }
        });
    } catch (error) {
        console.error('Error fetching manuscript dashboard:', error);
        return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
    }
}
