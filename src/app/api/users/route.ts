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
            const { email, name, password, role, managerId, companyId, companyIds, departmentId, phone, designationId, dateOfJoining } = body;

            if (!email || !password || !role) {
                return createErrorResponse('Missing required fields', 400);
            }

            const existing = await prisma.user.findUnique({ where: { email } });
            if (existing) {
                return createErrorResponse('User already exists', 409);
            }

            // Role Hierarchy Validation
            const ROLE_HIERARCHY: Record<string, number> = {
                'SUPER_ADMIN': 100,
                'ADMIN': 80,
                'FINANCE_ADMIN': 80,
                'MANAGER': 60,
                'TEAM_LEADER': 40,
                'EXECUTIVE': 20,
                'CUSTOMER': 0
            };

            const requesterLevel = ROLE_HIERARCHY[user.role] || 0;
            const targetLevel = ROLE_HIERARCHY[role as string] || 0;

            if (targetLevel > requesterLevel) {
                return createErrorResponse('Insufficient privileges to assign this role', 403);
            }
            // Strict check: Only SUPER_ADMIN can create ADMIN/FINANCE_ADMIN/SUPER_ADMIN
            if (['ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN'].includes(role) && user.role !== 'SUPER_ADMIN') {
                return createErrorResponse('Insufficient privileges to assign this role', 403);
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            // Determine company context
            const targetCompanyId = companyId || user.companyId;

            // Staff roles that should have employee profiles
            const staffRoles = ['EMPLOYEE', 'EXECUTIVE', 'TEAM_LEADER', 'MANAGER', 'ADMIN', 'HR_MANAGER', 'FINANCE_ADMIN'];
            const shouldCreateEmployeeProfile = staffRoles.includes(role);

            // Use transaction to ensure atomicity
            const newUser = await prisma.$transaction(async (tx) => {
                const createdUser = await tx.user.create({
                    data: {
                        email,
                        name,
                        password: hashedPassword,
                        role: role as any,
                        isActive: true,
                        companyId: targetCompanyId,
                        departmentId,
                        managerId: managerId || (['MANAGER', 'TEAM_LEADER'].includes(user.role) ? user.id : undefined),
                        companies: companyIds ? {
                            connect: companyIds.map((id: string) => ({ id }))
                        } : (targetCompanyId ? {
                            connect: [{ id: targetCompanyId }]
                        } : undefined)
                    }
                });

                // Create employee profile for staff roles
                if (shouldCreateEmployeeProfile) {
                    await tx.employeeProfile.create({
                        data: {
                            userId: createdUser.id,
                            employeeId: `EMP${Date.now()}`, // Generate unique employee ID
                            phoneNumber: phone || null,
                            designationId: designationId || null,
                            dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : new Date(),
                            leaveBalance: 20, // Default annual leave
                            currentLeaveBalance: 20,
                            initialLeaveBalance: 20
                        }
                    });
                }

                return createdUser;
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
