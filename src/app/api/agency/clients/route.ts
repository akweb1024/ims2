import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';

export const GET = authorizedRoute(
    ['AGENCY', 'SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE_ADMIN'],
    async (req: NextRequest, user) => {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 100);
        const search = searchParams.get('search')?.trim() || '';
        const status = searchParams.get('status')?.trim() || '';
        const skip = (page - 1) * limit;

        let agencyProfileId: string | null = null;

        if (user.role === 'AGENCY') {
            const agencyProfile = await prisma.customerProfile.findUnique({
                where: { userId: user.id },
                include: { agencyDetails: true },
            });

            if (!agencyProfile) {
                return NextResponse.json({
                    data: [],
                    pagination: { page, limit, total: 0, totalPages: 0 },
                    summary: { totalClients: 0, activeClients: 0, activeSubscriptions: 0 },
                });
            }

            agencyProfileId = agencyProfile.id;
        } else if (searchParams.get('agencyProfileId')) {
            agencyProfileId = searchParams.get('agencyProfileId');
        }

        if (!agencyProfileId) {
            return NextResponse.json(
                { error: 'agencyProfileId is required for non-agency users' },
                { status: 400 }
            );
        }

        const customerWhere: any = {
            agencyId: agencyProfileId,
            leadStatus: null,
        };

        if (user.companyId) {
            customerWhere.companyId = user.companyId;
        }

        if (search) {
            customerWhere.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { organizationName: { contains: search, mode: 'insensitive' } },
                { primaryEmail: { contains: search, mode: 'insensitive' } },
                { institution: { name: { contains: search, mode: 'insensitive' } } },
            ];
        }

        if (status) {
            customerWhere.subscriptions = {
                some: {
                    status,
                },
            };
        }

        const [customers, total, activeSubscriptions] = await Promise.all([
            prisma.customerProfile.findMany({
                where: customerWhere,
                skip,
                take: limit,
                orderBy: { updatedAt: 'desc' },
                include: {
                    institution: {
                        select: { id: true, name: true, type: true },
                    },
                    subscriptions: {
                        select: {
                            id: true,
                            status: true,
                            endDate: true,
                            updatedAt: true,
                            total: true,
                        },
                        orderBy: [{ updatedAt: 'desc' }],
                    },
                    invoices: {
                        select: {
                            id: true,
                            updatedAt: true,
                            total: true,
                            status: true,
                        },
                        orderBy: [{ updatedAt: 'desc' }],
                        take: 1,
                    },
                    communications: {
                        select: {
                            id: true,
                            createdAt: true,
                        },
                        orderBy: [{ createdAt: 'desc' }],
                        take: 1,
                    },
                },
            }),
            prisma.customerProfile.count({ where: customerWhere }),
            prisma.subscription.count({
                where: {
                    customerProfile: customerWhere,
                    status: 'ACTIVE',
                },
            }),
        ]);

        const data = customers.map((customer) => {
            const latestSubscription = customer.subscriptions[0] || null;
            const latestInvoice = customer.invoices[0] || null;
            const latestCommunication = customer.communications[0] || null;
            const activeSubscriptionCount = customer.subscriptions.filter(
                (subscription) => subscription.status === 'ACTIVE'
            ).length;

            const activityDates = [
                customer.updatedAt,
                latestSubscription?.updatedAt,
                latestInvoice?.updatedAt,
                latestCommunication?.createdAt,
            ].filter(Boolean) as Date[];

            activityDates.sort((a, b) => b.getTime() - a.getTime());

            return {
                id: customer.id,
                name: customer.name,
                organizationName:
                    customer.organizationName || customer.institution?.name || 'Independent Client',
                customerType: customer.customerType,
                primaryEmail: customer.primaryEmail,
                primaryPhone: customer.primaryPhone,
                activeSubscriptionCount,
                totalSubscriptionCount: customer.subscriptions.length,
                latestSubscriptionStatus: latestSubscription?.status || 'NO_SUBSCRIPTION',
                lastRenewalDate: latestSubscription?.endDate || null,
                lastActivityAt: activityDates[0] || customer.updatedAt,
                institution: customer.institution,
            };
        });

        const activeClients = data.filter((customer) => customer.activeSubscriptionCount > 0).length;

        return NextResponse.json({
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
            summary: {
                totalClients: total,
                activeClients,
                activeSubscriptions,
            },
        });
    }
);
