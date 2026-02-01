import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { logger } from '@/lib/logger';

// GET /api/staff-management/employees - List employees
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const companyId = searchParams.get('companyId');
            const departmentId = searchParams.get('departmentId');
            const id = searchParams.get('id');
            const status = searchParams.get('status');

            const where: any = {
                employeeProfile: {
                    isNot: null
                }
            };

            // Filter by company
            if (companyId && companyId !== 'all') {
                where.companyId = companyId;
            } else if (user.companyId) {
                where.companyId = user.companyId;
            }

            // Filter by department
            if (departmentId && departmentId !== 'all') {
                where.departmentId = departmentId;
            }

            // Filter by specific employee
            if (id && id !== 'all') {
                where.id = id;
            }

            // Filter by status
            if (status && status !== 'all') {
                where.isActive = status === 'ACTIVE';
            }

            const employees = await prisma.user.findMany({
                where,
                include: {
                    department: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    employeeProfile: {
                        include: {
                            designatRef: true
                        }
                    }
                },
                orderBy: {
                    name: 'asc'
                }
            });

            // Transform data to match component expectations
            const transformedEmployees = employees.map((emp: any) => ({
                id: emp.id,
                name: emp.name,
                email: emp.email,
                phone: emp.employeeProfile?.phoneNumber || '',
                companyId: emp.companyId,
                departmentId: emp.departmentId,
                designationId: emp.employeeProfile?.designationId,
                dateOfJoining: emp.employeeProfile?.dateOfJoining,
                status: emp.isActive ? 'ACTIVE' : 'INACTIVE',
                department: emp.department,
                designation: emp.employeeProfile?.designatRef ? {
                    title: emp.employeeProfile.designatRef.name,
                    ...emp.employeeProfile.designatRef
                } : null
            }));

            return NextResponse.json(transformedEmployees);
        } catch (error) {
            logger.error('Error fetching employees:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
);

// POST /api/staff-management/employees - Create new employee
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'],
    async (req: NextRequest, currentUser) => {
        try {
            const body = await req.json();
            const { name, email, phone, companyId, departmentId, designationId, dateOfJoining, status } = body;

            // Validate required fields
            if (!name || !email) {
                return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
            }

            // Check if user already exists
            const existingUser = await prisma.user.findUnique({
                where: { email }
            });

            if (existingUser) {
                return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
            }

            // Create user and employee profile in a transaction
            const newEmployee = await prisma.$transaction(async (tx) => {
                // Create user
                const user = await tx.user.create({
                    data: {
                        name,
                        email,
                        password: 'temp123', // Temporary password, should be changed on first login
                        role: 'EMPLOYEE' as any,
                        companyId: companyId || currentUser.companyId,
                        departmentId: departmentId || null,
                        isActive: status === 'ACTIVE',
                        allowedModules: ['CORE']
                    }
                });

                // Create employee profile
                const profile = await tx.employeeProfile.create({
                    data: {
                        userId: user.id,
                        phoneNumber: phone || null,
                        designationId: designationId || null,
                        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : new Date(),
                        employeeId: `EMP${Date.now()}` // Generate employee ID
                    }
                });

                return { user, profile };
            });

            return NextResponse.json({
                id: newEmployee.user.id,
                name: newEmployee.user.name,
                email: newEmployee.user.email,
                message: 'Employee created successfully'
            }, { status: 201 });
        } catch (error) {
            logger.error('Error creating employee:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
);
