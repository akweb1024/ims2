import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';

export const GET = authorizedRoute([], async (req: NextRequest, user: any) => {
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '1000');
        
        const users = await prisma.user.findMany({
            where: {
                companyId: user.companyId,
                isActive: true, // Only return active employees to be selected as partners
            },
            take: limit,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                employeeProfile: {
                    select: {
                        designation: true,
                        designatRef: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });
        
        return NextResponse.json({ data: users });
    } catch (error) {
        console.error('Failed to fetch Think Tank users:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
});
