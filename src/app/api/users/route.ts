import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import bcrypt from 'bcryptjs';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const companyId = searchParams.get('companyId') || user.companyId;
            const page = parseInt(searchParams.get('page') || '1');
            const limit = parseInt(searchParams.get('limit') || '20');
            const search = searchParams.get('search') || '';
            const skip = (page - 1) * limit;

            const where: any = {};

            // Role-based visibility
            if (user.role === 'MANAGER' || user.role === 'TEAM_LEADER') {
                where.OR = [
                    { managerId: user.id },
                    { id: user.id }
                ];
            }

            if (companyId && user.role !== 'SUPER_ADMIN') {
                where.companyId = companyId;
            } else if (companyId && user.role === 'SUPER_ADMIN') {
                where.companyId = companyId;
            }

            if (search) {
                const searchClause: any[] = [
                    { email: { contains: search, mode: 'insensitive' } },
                    { name: { contains: search, mode: 'insensitive' } }
                ];

                if (where.OR) {
                    where.AND = [
                        { OR: where.OR },
                        { OR: searchClause }
                    ];
                    delete where.OR;
                } else {
                    where.OR = searchClause;
                }
            }

            const [users, total] = await Promise.all([
                prisma.user.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        manager: {
                            select: {
                                id: true,
                                email: true,
                                role: true
                            }
                        },
                        company: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        department: {
                            select: {
                                name: true
                            }
                        },
                        employeeProfile: {
                            select: {
                                designation: true,
                                designationId: true,
                                designatRef: {
                                    select: {
                                        name: true
                                    }
                                }
                            }
                        },
                        _count: {
                            select: {
                                assignedSubscriptions: true,
                                tasks: true
                            }
                        }
                    }
                }),
                prisma.user.count({ where })
            ]);

            const safeUsers = users.map((u: any) => {
                const { password, ...safeUser } = u;
                return safeUser;
            });

            return NextResponse.json({
                data: safeUsers,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            });
        } catch (error: any) {
            console.error('Fetch Users Error:', error);
            return createErrorResponse('Internal Server Error', 500);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { email, name, password, role, managerId, companyId, companyIds, departmentId } = body;

            if (!email || !password || !role) {
                return createErrorResponse('Missing required fields', 400);
            }

            const existing = await prisma.user.findUnique({ where: { email } });
            if (existing) {
                return createErrorResponse('User already exists', 409);
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            // Determine company context
            const targetCompanyId = companyId || user.companyId;

            const newUser = await prisma.user.create({
                data: {
                    email,
                    name,
                    password: hashedPassword,
                    role,
                    isActive: true,
                    companyId: targetCompanyId,
                    departmentId, // Add departmentId
                    managerId: managerId || (['MANAGER', 'TEAM_LEADER'].includes(user.role) ? user.id : undefined),
                    companies: companyIds ? {
                        connect: companyIds.map((id: string) => ({ id }))
                    } : (targetCompanyId ? {
                        connect: [{ id: targetCompanyId }]
                    } : undefined),
                    employeeProfile: !['CUSTOMER', 'AGENCY'].includes(role) ? {
                        create: {}
                    } : undefined
                }
            });

            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'create',
                    entity: 'user',
                    entityId: newUser.id,
                    changes: { email, role }
                }
            });

            const { password: _, ...safeUser } = newUser;
            return NextResponse.json(safeUser);
        } catch (error: any) {
            console.error('Create User Error:', error);
            return createErrorResponse('Internal Server Error', 500);
        }
    }
);
