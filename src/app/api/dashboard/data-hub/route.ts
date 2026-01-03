import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const [journals, users, companies, customers] = await Promise.all([
            prisma.journal.count(),
            prisma.user.count({
                where: decoded.role === 'SUPER_ADMIN' ? {} : { companyId: decoded.companyId }
            }),
            prisma.company.count(),
            prisma.customerProfile.count({
                where: decoded.role === 'SUPER_ADMIN' ? {} : { companyId: decoded.companyId }
            })
        ]);

        return NextResponse.json({
            journals,
            users,
            companies,
            customers
        });

    } catch (error: any) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
