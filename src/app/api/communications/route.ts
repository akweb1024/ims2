import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, ValidationError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { calculatePredictions } from '@/lib/predictions';

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'EXECUTIVE', 'MANAGER', 'FINANCE_ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const {
                customerProfileId, channel, type, subject, notes, outcome,
                nextFollowUpDate, duration, recordingUrl, referenceId,
                category, previousFollowUpId, checklist
            } = body;

            if (!customerProfileId || !channel || !subject || !notes) {
                throw new ValidationError('Missing required fields: customerProfileId, channel, subject, and notes are required');
            }

            if (!checklist || !checklist.checkedItems || checklist.checkedItems.length === 0) {
                throw new ValidationError('Conversation checklist is required. Please check at least one item.');
            }

            const log = await prisma.communicationLog.create({
                data: {
                    customerProfileId,
                    userId: user.id,
                    channel,
                    type: type || 'COMMENT',
                    subject,
                    notes,
                    outcome,
                    duration,
                    recordingUrl,
                    referenceId,
                    nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
                    category: category || null,
                    date: new Date(),
                    companyId: user.companyId || null
                }
            });

            // Create Checklist with server-side prediction recalculation
            const serverPredictions = calculatePredictions(checklist.checkedItems);
            await prisma.conversationChecklist.create({
                data: {
                    communicationLogId: log.id,
                    checkedItems: checklist.checkedItems,
                    renewalLikelihood: serverPredictions.renewalLikelihood,
                    upsellPotential: serverPredictions.upsellPotential,
                    churnRisk: serverPredictions.churnRisk,
                    customerHealth: serverPredictions.customerHealth,
                    insights: serverPredictions.insights || [],
                    recommendedActions: serverPredictions.recommendedActions || [],
                    companyId: user.companyId || null
                }
            });

            // Mark previous follow-up as completed
            if (previousFollowUpId) {
                await prisma.communicationLog.update({
                    where: { id: previousFollowUpId },
                    data: { isFollowUpCompleted: true }
                });
            }

            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'create',
                    entity: 'communication_log',
                    entityId: log.id,
                    changes: JSON.stringify(body)
                }
            });

            logger.info('Communication log created', { logId: log.id, createdBy: user.id, channel });

            return NextResponse.json(log, { status: 201 });
        } catch (error: any) {
            return handleApiError(error, req.nextUrl.pathname);
        }
    }
);

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'MANAGER', 'EXECUTIVE'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const page = parseInt(searchParams.get('page') || '1');
            const limit = parseInt(searchParams.get('limit') || '20');
            const skip = (page - 1) * limit;

            const userCompanyId = user.companyId;
            const where: any = {};

            if (user.role !== 'SUPER_ADMIN' && userCompanyId) {
                where.companyId = userCompanyId;
            }

            if (user.role === 'EXECUTIVE') {
                where.OR = [
                    { userId: user.id },
                    {
                        customerProfile: {
                            OR: [
                                { assignedToUserId: user.id },
                                { assignedExecutives: { some: { id: user.id } } }
                            ]
                        }
                    }
                ];
            } else if (user.role === 'MANAGER') {
                where.OR = [
                    { userId: user.id },
                    { user: { managerId: user.id } },
                    {
                        customerProfile: {
                            OR: [
                                { assignedTo: { managerId: user.id } },
                                { assignedExecutives: { some: { managerId: user.id } } }
                            ]
                        }
                    }
                ];
            }

            const [logs, total] = await Promise.all([
                prisma.communicationLog.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { date: 'desc' },
                    include: {
                        customerProfile: {
                            select: {
                                name: true,
                                organizationName: true,
                                customerType: true,
                                institution: { select: { id: true, name: true, code: true } }
                            }
                        },
                        user: { select: { id: true, email: true, role: true } }
                    }
                }),
                prisma.communicationLog.count({ where })
            ]);

            // Restrict note visibility for EXECUTIVE viewing others' logs
            const processedLogs = logs.map(log => {
                if (user.role === 'EXECUTIVE' && log.userId !== user.id) {
                    return { ...log, notes: '*** Restricted ***', subject: '*** Restricted ***' };
                }
                return log;
            });

            return NextResponse.json({
                data: processedLogs,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
            });
        } catch (error: any) {
            return handleApiError(error, req.nextUrl.pathname);
        }
    }
);
