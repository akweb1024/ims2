import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, ValidationError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const companyId = user.companyId;
            if (!companyId) throw new ValidationError('No associated company');

            const accounts = await prisma.account.findMany({
                where: { companyId },
                include: { parentAccount: true },
                orderBy: { code: 'asc' }
            });

            return NextResponse.json(accounts);
        } catch (error) {
            return handleApiError(error, req.nextUrl.pathname);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const companyId = user.companyId;
            if (!companyId) throw new ValidationError('No associated company');

            const data = await req.json();

            const account = await prisma.account.create({
                data: {
                    companyId,
                    code: data.code,
                    name: data.name,
                    type: data.type,
                    description: data.description,
                    parentAccountId: data.parentAccountId || null,
                }
            });

            logger.info('Account created', { accountId: account.id, createdBy: user.id });

            return NextResponse.json(account, { status: 201 });
        } catch (error) {
            return handleApiError(error, req.nextUrl.pathname);
        }
    }
);
