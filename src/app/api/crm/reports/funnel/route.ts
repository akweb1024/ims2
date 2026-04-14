import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req, user) => {
        try {
            const companyId = user.companyId;

            const [leadsCount, qualifiedCount, dealsCount, wonCount] = await Promise.all([
                // 1. Total Leads
                prisma.customerProfile.count({
                    where: { 
                        companyId,
                        leadStatus: { not: null }
                    }
                }),
                // 2. Qualified Leads
                prisma.customerProfile.count({
                    where: {
                        companyId,
                        leadStatus: { in: ['QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'CONVERTED'] }
                    }
                }),
                // 3. Deals
                prisma.deal.count({
                    where: { companyId }
                }),
                // 4. Won
                prisma.deal.count({
                    where: { 
                        companyId,
                        stage: 'CLOSED_WON'
                    }
                })
            ]);

            const funnelData = [
                { stage: 'Proposals', count: leadsCount, percentage: 100 },
                { 
                    stage: 'Qualified', 
                    count: qualifiedCount, 
                    percentage: leadsCount > 0 ? (qualifiedCount / leadsCount) * 100 : 0 
                },
                { 
                    stage: 'Opportunities', 
                    count: dealsCount, 
                    percentage: qualifiedCount > 0 ? (dealsCount / qualifiedCount) * 100 : 0 
                },
                { 
                    stage: 'Closed Won', 
                    count: wonCount, 
                    percentage: dealsCount > 0 ? (wonCount / dealsCount) * 100 : 0 
                }
            ];

            return NextResponse.json(funnelData);
        } catch (error) {
            console.error('Funnel Report Error:', error);
            return NextResponse.json({ error: 'Failed to generate funnel report' }, { status: 500 });
        }
    }
);
