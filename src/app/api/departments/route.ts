import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const companyId = searchParams.get('companyId');

        const where: any = {};
        if (companyId) {
            where.companyId = companyId;
        } else if (decoded.role !== 'SUPER_ADMIN' && decoded.companyId) {
            where.companyId = decoded.companyId;
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
        const { companyId, name, code, description, parentDepartmentId, headUserId } = body;

        if (!companyId || !name) {
            return NextResponse.json({ error: 'Company ID and Name are required' }, { status: 400 });
        }

        const department = await prisma.department.create({
            data: {
                companyId,
                name,
                code,
                description,
                parentDepartmentId,
                headUserId,
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
