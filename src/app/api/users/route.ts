import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import bcrypt from 'bcryptjs';
import {
    assertCompanyAccess,
    canAccessAllCompanies,
    normalizeAllowedModulesForWrite,
    resolveCompanyScope,
} from '@/lib/access-policy';

const DEFAULT_LEAVE_BALANCE = parseInt(process.env.DEFAULT_LEAVE_BALANCE || '20', 10);

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const companyId = await resolveCompanyScope(req, user, {
                allowAll: canAccessAllCompanies(user),
                required: false,
            });
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

            if (companyId) {
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
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { email, name, password, role, managerId, companyId, companyIds, allowedModules, departmentId, phone, designationId, dateOfJoining } = body;

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
            if (targetCompanyId) {
                await assertCompanyAccess(user, targetCompanyId, 'create a user in this company');
            }
            const normalizedCompanyIds = Array.isArray(companyIds)
                ? Array.from(new Set(companyIds.filter(Boolean)))
                : (targetCompanyId ? [targetCompanyId] : []);
            for (const id of normalizedCompanyIds) {
                await assertCompanyAccess(user, id, 'grant user access to this company');
            }
            const normalizedAllowedModules = normalizeAllowedModulesForWrite(user, allowedModules) || ['CORE'];

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
                        allowedModules: normalizedAllowedModules,
                        companies: normalizedCompanyIds.length ? {
                            connect: normalizedCompanyIds.map((id: string) => ({ id }))
                        } : undefined
                    }
                });

                // Create employee profile for staff roles
                if (shouldCreateEmployeeProfile) {
                    await tx.employeeProfile.create({
                        data: {
                            userId: createdUser.id,
                            employeeId: `EMP${Date.now()}`,
                            phoneNumber: phone || null,
                            designationId: designationId || null,
                            dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : new Date(),
                            leaveBalance: DEFAULT_LEAVE_BALANCE,
                            currentLeaveBalance: DEFAULT_LEAVE_BALANCE,
                            initialLeaveBalance: DEFAULT_LEAVE_BALANCE
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
            return createErrorResponse(error);
        }
    }
);

// Style guide accessibility compliance helper comment: aria-label placeholder label
