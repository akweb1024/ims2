import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { convertThinkTankIdeaToExecution } from '@/lib/think-tank';

export async function POST(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const companyId = user.companyId || (await prisma.company.findFirst())?.id;
        if (!companyId) {
            return NextResponse.json({ error: 'No active company context' }, { status: 400 });
        }

                const body = await req.json();
        const { 
            ideaId, 
            mode, 
            title, 
            description, 
            requirements,
            ownerUserId,
            memberIds,
            startDate,
            endDate,
            dueDate,
            priority
        } = body;

        if (!ideaId || !mode) {
            return NextResponse.json({ error: 'Missing ideaId or mode' }, { status: 400 });
        }

        const idea = await prisma.thinkTankIdea.findFirst({
            where: { id: ideaId, companyId }
        });

        if (!idea) {
            return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
        }

        // Auto-approve the idea if it isn't already to avoid lifecycle blocks during promotion
        if (!['APPROVED', 'IMPLEMENTED'].includes(idea.reviewStage)) {
            await prisma.thinkTankIdea.update({
                where: { id: idea.id },
                data: {
                    reviewStage: 'APPROVED',
                    approvedAt: new Date()
                }
            });
        }

        if (mode === 'JOB') {
            const jobPosting = await prisma.jobPosting.create({
                data: {
                    companyId,
                    title: title || idea.topic,
                    description: description || idea.description,
                    requirements: requirements || idea.decisionNotes || 'Experience implementing innovation strategies.',
                    status: 'OPEN',
                    type: 'FULL_TIME',
                    salaryRange: 'Negotiable'
                }
            });

            // Update Think Tank Idea link
            const existingMetadata = (idea.metadata as Record<string, any> | null) || {};
            await prisma.thinkTankIdea.update({
                where: { id: idea.id },
                data: {
                    implementationStatus: 'PLANNED',
                    metadata: {
                        ...existingMetadata,
                        executionLink: {
                            type: 'JOB',
                            id: jobPosting.id,
                            title: jobPosting.title,
                            convertedAt: new Date().toISOString(),
                            convertedById: user.id
                        }
                    }
                }
            });

            return NextResponse.json({
                success: true,
                type: 'JOB',
                entity: jobPosting
            });
        }

        if (mode === 'PROJECT' || mode === 'TASK') {
            const result = await convertThinkTankIdeaToExecution({
                ideaId: idea.id,
                companyId,
                convertedById: user.id,
                mode: mode as 'PROJECT' | 'TASK',
                title: title || idea.topic,
                description: description || idea.description,
                ownerUserId,
                memberIds,
                startDate,
                endDate,
                dueDate,
                priority
            });

            return NextResponse.json({
                success: true,
                type: result.type,
                entity: result.entity
            });
        }

        return NextResponse.json({ error: 'Unsupported promotion mode' }, { status: 400 });

    } catch (error: any) {
        console.error('Think Tank Idea Promotion Error:', error);
        return NextResponse.json({ error: error.message || 'Promotion failed' }, { status: 500 });
    }
}
