import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, decoded) => {
        try {
            const { searchParams } = new URL(req.url);
            const page = parseInt(searchParams.get('page') || '1');
            const limit = parseInt(searchParams.get('limit') || '12');
            const skip = (page - 1) * limit;

            const [companies, total] = await Promise.all([
                prisma.company.findMany({
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        _count: {
                            select: { users: true }
                        }
                    }
                }),
                prisma.company.count()
            ]);

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
            const { name, address, phone, email, website } = body;

            if (!name) {
                return createErrorResponse('Company Name is required', 400);
            }

            const company = await prisma.company.create({
                data: {
                    name,
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
