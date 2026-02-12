import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'],
    async (req: NextRequest, user) => {
        try {
            const where: any = {
                role: { in: ['EXECUTIVE', 'FINANCE_ADMIN', 'MANAGER', 'SUPER_ADMIN', 'ADMIN', 'TEAM_LEADER'] }
            };

            // ...

            const userCompanyId = user.companyId;
            if (userCompanyId && user.role !== 'SUPER_ADMIN') {
                where.companyId = userCompanyId;
            }

            if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                const subIds = await getDownlineUserIds(user.id, userCompanyId || undefined);
                // Usually Managers want to see their team AND themselves in a list? 
                // Or just team? The page component says "Our Team".
                // Let's include self + subordinates.
                where.id = { in: [...subIds, user.id] };
            }

            const team = await prisma.user.findMany({
                where,
                select: {
                    id: true,
                    email: true,
                    role: true,
                    isActive: true,
                    lastLogin: true,
                    createdAt: true,
                    _count: {
                        select: {
                            assignedSubscriptions: true,
                            tasks: { where: { status: 'PENDING' } }
                        }
                    }
                }
            });

            // Enrich with Last Pulse
            const { getLastPulse } = await import('@/lib/services/activity-service');
            const teamWithPulse = await Promise.all(team.map(async (member) => {
                const lastPulse = await getLastPulse(member.id);
                return { ...member, lastPulse };
            }));

            return NextResponse.json(teamWithPulse);
        } catch (error: any) {
            console.error('Fetch Team Error:', error);
            return createErrorResponse('Internal Server Error', 500);
        }
    }
);
