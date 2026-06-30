import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { assertCompanyAccess, canAccessAllCompanies, resolveCompanyScope } from '@/lib/access-policy';

export async function GET(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const companyId = await resolveCompanyScope(req, decoded, {
            allowAll: canAccessAllCompanies(decoded),
            required: false,
        });

        const where: any = {};
        if (companyId) {
            where.companyId = companyId;
        }

        const departments = await prisma.department.findMany({
            where,
            orderBy: { name: 'asc' },
            include: {
                headUser: {
                    select: {
                        id: true,
                        email: true,
                        role: true
                    }
                },
                parentDepartment: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                _count: {
                    select: {
                        users: true,
                        subDepartments: true
                    }
                }
            }
        });

        return NextResponse.json(departments);
    } catch (error: any) {
        console.error('Fetch Departments Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'ADMIN'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { companyId, name, code, description, parentDepartmentId, headUserId, departmentType } = body;

        if (!companyId || !name) {
            return NextResponse.json({ error: 'Company ID and Name are required' }, { status: 400 });
        }
        await assertCompanyAccess(decoded, companyId, 'create a department in this company');

        const department = await prisma.department.create({
            data: {
                companyId,
                name,
                code,
                description,
                parentDepartmentId,
                headUserId,
                ...(departmentType !== undefined && { departmentType }),
                isActive: true
            },
            include: {
                headUser: {
                    select: {
                        id: true,
                        email: true,
                        role: true
                    }
                }
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: decoded.id,
                action: 'create',
                entity: 'department',
                entityId: department.id,
                changes: JSON.stringify({ name, code })
            }
        });

        return NextResponse.json(department, { status: 201 });
    } catch (error: any) {
        console.error('Create Department Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
