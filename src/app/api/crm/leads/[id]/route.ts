import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError } from '@/lib/error-handler';
import { z } from 'zod';

const updateLeadSchema = z.object({
    name: z.string().min(2).optional(),
    primaryEmail: z.string().email().optional(),
    primaryPhone: z.string().optional(),
    organizationName: z.string().optional(),
    leadStatus: z.string().optional(),
    leadScore: z.number().optional(),
    source: z.string().optional(),
    notes: z.string().optional(),
    assignedToUserId: z.string().optional().nullable(),
});

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE'],
    async (req, user, { params }) => {
        try {
            const { id } = await params;

            const lead = await prisma.customerProfile.findFirst({
                where: {
                    id,
                    companyId: user.companyId,
                    leadStatus: { not: null }
                },
                include: {
                    assignedTo: {
                        select: { id: true, name: true, email: true }
                    },
                    communications: {
                        orderBy: { date: 'desc' },
                        include: {
                            user: {
                                select: { id: true, name: true }
                            }
                        }
                    },
                    deals: {
                        orderBy: { updatedAt: 'desc' }
                    }
                }
            });

            if (!lead) {
                return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
            }

            return NextResponse.json(lead);
        } catch (error) {
            return handleApiError(error, 'Failed to fetch lead');
        }
    }
);

export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'],
    async (req, user, { params }) => {
        try {
            const { id } = await params;
            const body = await req.json();
            const validated = updateLeadSchema.parse(body);

            // Safety check: ensure lead belongs to company
            const existing = await prisma.customerProfile.findFirst({
                where: { id, companyId: user.companyId, leadStatus: { not: null } }
            });

            if (!existing) {
                return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
            }

            const updatedLead = await prisma.customerProfile.update({
                where: { id },
                data: validated as any
            });

            return NextResponse.json(updatedLead);
        } catch (error) {
            return handleApiError(error, 'Failed to update lead');
        }
    }
);

export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req, user, { params }) => {
        try {
            const { id } = await params;

            // Check ownership/access
            const lead = await prisma.customerProfile.findFirst({
                where: { id, companyId: user.companyId, leadStatus: { not: null } },
                select: { id: true, userId: true, notes: true }
            });

            if (!lead) {
                return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
            }

            const archiveNote = `[${new Date().toISOString()}] Lead archived by ${user.id}; profile retained for CRM history.`;
            await prisma.$transaction(async (tx) => {
                await tx.customerProfile.update({
                    where: { id },
                    data: {
                        leadStatus: 'LOST',
                        notes: lead.notes ? `${lead.notes}\n${archiveNote}` : archiveNote
                    }
                });

                if (lead.userId) {
                    await tx.user.update({
                        where: { id: lead.userId },
                        data: { isActive: false }
                    });
                }
            });

            return NextResponse.json({ message: 'Lead archived successfully' });
        } catch (error) {
            return handleApiError(error, 'Failed to delete lead');
        }
    }
);
