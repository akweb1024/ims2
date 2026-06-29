import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { logger } from '@/lib/logger';
import { listStaffEmployees } from '@/lib/services/hr/listStaffEmployees';
import { provisionEmployee } from '@/lib/kra/provision';

// GET /api/staff-management/employees - List employees
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR', 'MANAGER', 'TEAM_LEADER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const transformedEmployees = await listStaffEmployees({ user, params: searchParams });
            return NextResponse.json(transformedEmployees);
        } catch (error) {
            logger.error('Error fetching employees:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
);

// POST /api/staff-management/employees - Create new employee
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'],
    async (req: NextRequest, currentUser) => {
        try {
            const body = await req.json();
            const { name, email, phone, companyId, departmentId, designationId, dateOfJoining, status, managerId } = body;

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
            const newEmployee = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                // Create user
                const user = await tx.user.create({
                    data: {
                        name,
                        email,
                        password: 'temp123', // Temporary password
                        role: 'EMPLOYEE' as any,
                        companyId: companyId || currentUser.companyId,
                        departmentId: departmentId || null,
                        managerId: managerId || null,
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

            // New-hire KRA/Goals auto-provisioning (idempotent; non-fatal).
            try {
                await provisionEmployee(newEmployee.user.id, currentUser.id);
            } catch (err) {
                logger.error('KRA provisioning failed for new employee', err, { userId: newEmployee.user.id });
            }

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

// Style guide accessibility compliance helper comment: aria-label placeholder label
