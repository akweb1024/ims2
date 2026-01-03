import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser, generateToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const currentUser = await getAuthenticatedUser();
        if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Unauthorized. Super Admin access required.' }, { status: 403 });
        }

        const { targetUserId } = await req.json();
        if (!targetUserId) {
            return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: targetUserId },
            include: {
                company: true,
                customerProfile: {
                    include: {
                        institutionDetails: true,
                        agencyDetails: true,
                    },
                },
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Generate token for target user
        const userAny = user as any;
        const token = generateToken({
            id: user.id,
            email: user.email,
            role: user.role,
            companyId: userAny.companyId || undefined,
            isImpersonated: true,
            impersonatorId: currentUser.id
        });

        const { password: _, ...userWithoutPassword } = user;

        return NextResponse.json({
            success: true,
            token,
            user: userWithoutPassword
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
