import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { canAccessAllCompanies, getAvailableCompaniesForUser } from '@/lib/access-policy';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE', 'FINANCE_ADMIN', 'HR_MANAGER', 'HR', 'EMPLOYEE'],
    async (req: NextRequest, decoded) => {
        try {
            const { searchParams } = new URL(req.url);
            const page = parseInt(searchParams.get('page') || '1');
            const limit = parseInt(searchParams.get('limit') || '12');
            const skip = (page - 1) * limit;

            let companies;
            let total;
            if (canAccessAllCompanies(decoded)) {
                [companies, total] = await Promise.all([
                    prisma.company.findMany({
                        skip,
                        take: limit,
                        orderBy: { createdAt: 'desc' },
                        include: {
                            _count: {
                                // `users` = multi-company membership join; `primaryUsers` =
                                // people whose companyId points here (the actual headcount).
                                select: { users: true, primaryUsers: true }
                            }
                        }
                    }),
                    prisma.company.count()
                ]);
            } else {
                const availableCompanies = await getAvailableCompaniesForUser(decoded);
                total = availableCompanies.length;
                companies = availableCompanies.slice(skip, skip + limit).map((company) => ({
                    ...company,
                    _count: { users: 0 },
                }));
            }

            return NextResponse.json({
                data: companies,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            });
        } catch (error: any) {
            return createErrorResponse(error.message, 500);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN'],
    async (req: NextRequest, decoded) => {
        try {
            const body = await req.json();
            const { name, domain, address, phone, email, website } = body;

            if (!name) {
                return createErrorResponse('Company Name is required', 400);
            }

            const company = await prisma.company.create({
                data: {
                    name,
                    domain,
                    address,
                    phone,
                    email,
                    website
                }
            });

            return NextResponse.json(company, { status: 201 });
        } catch (error: any) {
            return createErrorResponse(error.message, 500);
        }
    }
);
