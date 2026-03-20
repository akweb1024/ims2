import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError } from '@/lib/error-handler';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'],
    async (req: NextRequest, user, { params }) => {
        try {
            const { id } = await params;

            const deal = await prisma.deal.findFirst({
                where: {
                    id,
                    companyId: user.companyId
                },
                include: {
                    customer: {
                        select: { id: true, name: true, organizationName: true, leadStatus: true }
                    },
                    owner: {
                        select: { id: true, name: true, email: true }
                    }
                }
            });

            if (!deal) {
                return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
            }

            return NextResponse.json(deal);
        } catch (error) {
            return handleApiError(error, req.nextUrl.pathname);
        }
    }
);

export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'],
    async (req: NextRequest, user, { params }) => {
        try {
            const { id } = await params;
            const body = await req.json();

            const existing = await prisma.deal.findFirst({
                where: { id, companyId: user.companyId }
            });

            if (!existing) {
                return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
            }

            const updatedDeal = await prisma.$transaction(async (tx) => {
                const nextDeal = await tx.deal.update({
                    where: { id },
                    data: {
                        title: body.title,
                        value: body.value !== undefined ? parseFloat(body.value) : undefined,
                        currency: body.currency,
                        stage: body.stage,
                        customerId: body.customerId,
                        ownerId: body.ownerId,
                        expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : undefined,
                        notes: body.notes
                    }
                });

                if (body.stage === 'CLOSED_WON') {
                    const linkedProspect = await tx.customerProfile.findFirst({
                        where: {
                            id: nextDeal.customerId,
                            companyId: user.companyId,
                            leadStatus: { not: null }
                        }
                    });

                    if (linkedProspect) {
                        await tx.customerProfile.update({
                            where: { id: linkedProspect.id },
                            data: {
                                leadStatus: null,
                                updatedAt: new Date()
                            }
                        });

                        await tx.communicationLog.create({
                            data: {
                                customerProfileId: linkedProspect.id,
                                userId: user.id || '',
                                companyId: user.companyId || '',
                                channel: 'System',
                                type: 'COMMENT',
                                subject: 'Prospect converted to customer',
                                notes: `This prospect became a customer when deal "${nextDeal.title}" was marked won by ${user.email}.`,
                                date: new Date()
                            }
                        });

                        await tx.auditLog.create({
                            data: {
                                userId: user.id,
                                action: 'CONVERT_LEAD',
                                entity: 'CustomerProfile',
                                entityId: linkedProspect.id,
                                changes: {
                                    leadStatus: { from: linkedProspect.leadStatus, to: null },
                                    conversionSource: { from: 'prospect', to: `won_deal:${nextDeal.id}` }
                                }
                            }
                        });
                    }
                }

                return nextDeal;
            });

            return NextResponse.json(updatedDeal);
        } catch (error) {
            return handleApiError(error, req.nextUrl.pathname);
        }
    }
);

export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'],
    async (req: NextRequest, user, { params }) => {
        try {
            const { id } = await params;

            const deal = await prisma.deal.findFirst({
                where: { id, companyId: user.companyId }
            });

            if (!deal) {
                return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
            }

            await prisma.deal.delete({
                where: { id }
            });

            return NextResponse.json({ message: 'Deal deleted successfully' });
        } catch (error) {
            return handleApiError(error, req.nextUrl.pathname);
        }
    }
);
