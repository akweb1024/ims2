import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'MANAGER'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const companyId = searchParams.get('companyId');

        const where: any = {};
        if (decoded.role === 'MANAGER') {
            where.managerId = decoded.id;
        }

        if (companyId) {
            where.companyId = companyId;
        }

        const users = await prisma.user.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                manager: {
                    select: {
                        id: true,
                        email: true,
                        role: true
                    }
                },
                _count: {
                    select: {
                        assignedSubscriptions: true,
                        tasks: true
                    }
                }
            }
        });

        // Don't send passwords
        const safeUsers = users.map(user => {
            const { password, ...safeUser } = user;
            return safeUser;
        });

        return NextResponse.json(safeUsers);

    } catch (error: any) {
        console.error('Fetch Users Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'MANAGER'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { email, password, role, managerId, companyId } = body;

        if (!email || !password || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json({ error: 'User already exists' }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Determine company context
        let targetCompanyId = companyId;
        if (!targetCompanyId && decoded.role !== 'SUPER_ADMIN') {
            const currentUser = await prisma.user.findUnique({ where: { id: decoded.id } });
            targetCompanyId = currentUser?.companyId;
        }

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role,
                isActive: true,
                companyId: targetCompanyId,
                managerId: managerId || (decoded.role === 'MANAGER' ? decoded.id : undefined),
                // Auto-create profile for staff roles
                employeeProfile: !['CUSTOMER', 'AGENCY'].includes(role) ? {
                    create: {}
                } : undefined
            }
        });

        // Audit Log
        await prisma.auditLog.create({
            data: {
                userId: decoded.id,
                action: 'create',
                entity: 'user',
                entityId: user.id,
                changes: JSON.stringify({ email, role })
            }
        });

        const { password: _, ...safeUser } = user;
        return NextResponse.json(safeUser);

    } catch (error: any) {
        console.error('Create User Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
