import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError } from '@/lib/error-handler';
import { SubscriptionStatus } from '@/types';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const page = parseInt(searchParams.get('page') || '1');
            const limit = parseInt(searchParams.get('limit') || '10');
            const status = searchParams.get('status') as SubscriptionStatus | null;
            const search = searchParams.get('search') || '';

            const skip = (page - 1) * limit;

            const where: any = {};
            const userCompanyId = user.companyId;

            if (userCompanyId) {
                where.companyId = userCompanyId;
            }

            if (status) {
                where.status = status;
            }

            if (search) {
                where.OR = [
                    { customerProfile: { name: { contains: search, mode: 'insensitive' } } },
                    { customerProfile: { organizationName: { contains: search, mode: 'insensitive' } } },
                    { id: { contains: search, mode: 'insensitive' } },
                    { items: { some: { journal: { name: { contains: search, mode: 'insensitive' } } } } },
                    { items: { some: { course: { title: { contains: search, mode: 'insensitive' } } } } },
                    { items: { some: { workshop: { title: { contains: search, mode: 'insensitive' } } } } },
                    { items: { some: { product: { name: { contains: search, mode: 'insensitive' } } } } }
                ];
            }

            // Special handling for CUSTOMER role
            if (user.role === 'CUSTOMER') {
                const customerProfile = await prisma.customerProfile.findUnique({
                    where: { userId: user.id }
                });
                if (!customerProfile) {
                    return NextResponse.json({ data: [], pagination: { total: 0 } });
                }
                where.customerProfileId = customerProfile.id;
            }

            const [subscriptions, total] = await Promise.all([
                (prisma.subscription as any).findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        customerProfile: {
                            select: {
                                id: true,
                                name: true,
                                organizationName: true,
                                primaryEmail: true
                            }
                        },
                        items: {
                            include: {
                                journal: { select: { id: true, name: true } },
                                plan: { select: { id: true, planType: true, format: true } },
                                course: { select: { id: true, title: true } },
                                workshop: { select: { id: true, title: true } },
                                product: { select: { id: true, name: true, type: true } }
                            }
                        }
                    }
                }),
                prisma.subscription.count({ where })
            ]);

            return NextResponse.json({
                data: subscriptions,
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
            });

        } catch (error: any) {
            return handleApiError(error, req.nextUrl.pathname);
        }
    }
);
