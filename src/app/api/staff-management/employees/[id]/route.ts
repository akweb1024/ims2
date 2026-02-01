import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { logger } from '@/lib/logger';

// GET /api/staff-management/employees/[id] - Get specific employee
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'],
    async (req: NextRequest, user, { params }: { params: { id: string } }) => {
        try {
            const { id } = params;

            const employee = await prisma.user.findUnique({
                where: { id },
                include: {
                    department: true,
                    employeeProfile: true
                }
            });

            if (!employee) {
                return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
            }

            // Fetch designation separately if designationId exists
            let designation = null;
            if (employee.employeeProfile?.designationId) {
                designation = await prisma.designation.findUnique({
                    where: { id: employee.employeeProfile.designationId }
                });
            }

            return NextResponse.json({
                id: employee.id,
                name: employee.name,
                email: employee.email,
                phone: employee.employeeProfile?.phoneNumber,
                companyId: employee.companyId,
                departmentId: employee.departmentId,
                designationId: employee.employeeProfile?.designationId,
                dateOfJoining: employee.employeeProfile?.dateOfJoining,
                status: employee.isActive ? 'ACTIVE' : 'INACTIVE',
                department: employee.department,
                designation
            });
        } catch (error) {
            logger.error('Error fetching employee:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
);

// PUT /api/staff-management/employees/[id] - Update employee
export const PUT = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'],
    async (req: NextRequest, user, { params }: { params: { id: string } }) => {
        try {
            const { id } = params;
            const body = await req.json();
            const { name, email, phone, departmentId, designationId, dateOfJoining, status, managerId } = body;

            // Update user and employee profile
            await prisma.$transaction(async (tx) => {
                await tx.user.update({
                    where: { id },
                    data: {
                        name,
                        email,
                        departmentId: departmentId || null,
                        managerId: managerId || null,
                        isActive: status === 'ACTIVE'
                    }
                });

                // Update employee profile
                await tx.employeeProfile.updateMany({
                    where: { userId: id },
                    data: {
                        phoneNumber: phone || null,
                        designationId: designationId || null,
                        dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : undefined
                    }
                });
            });

            return NextResponse.json({ message: 'Employee updated successfully' });
        } catch (error) {
            logger.error('Error updating employee:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
);

// PATCH /api/staff-management/employees/[id] - Update employee status
export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'],
    async (req: NextRequest, user, { params }: { params: { id: string } }) => {
        try {
            const { id } = params;
            const body = await req.json();
            const { status } = body;

            await prisma.user.update({
                where: { id },
                data: {
                    isActive: status === 'ACTIVE'
                }
            });

            return NextResponse.json({ message: 'Status updated successfully' });
        } catch (error) {
            logger.error('Error updating employee status:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
);

// DELETE /api/staff-management/employees/[id] - Delete employee (soft delete)
export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'],
    async (req: NextRequest, user, { params }: { params: { id: string } }) => {
        try {
            const { id } = params;

            // Soft delete by setting isActive to false
            await prisma.user.update({
                where: { id },
                data: {
                    isActive: false
                }
            });

            return NextResponse.json({ message: 'Employee deleted successfully' });
        } catch (error) {
            logger.error('Error deleting employee:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
);
