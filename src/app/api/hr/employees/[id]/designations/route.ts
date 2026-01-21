import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { z } from 'zod';

// Validation schema for company designation
const companyDesignationSchema = z.object({
    companyId: z.string(),
    designation: z.string().min(1, 'Designation is required'),
    isPrimary: z.boolean().optional().default(false),
    isActive: z.boolean().optional().default(true),
});

// GET: Fetch all company-designation mappings for an employee
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR', 'MANAGER'],
    async (req: NextRequest, user, { params }: { params: { id: string } }) => {
        try {
            const employeeId = params.id;

            const designations = await prisma.employeeCompanyDesignation.findMany({
                where: { employeeId },
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                            employeeIdPrefix: true,
                        }
                    }
                },
                orderBy: [
                    { isPrimary: 'desc' },
                    { assignedAt: 'desc' }
                ]
            });

            return NextResponse.json(designations);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// POST: Add employee to a company with designation
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR'],
    async (req: NextRequest, user, { params }: { params: { id: string } }) => {
        try {
            const employeeId = params.id;
            const body = await req.json();

            const result = companyDesignationSchema.safeParse(body);
            if (!result.success) {
                return createErrorResponse(result.error);
            }

            const { companyId, designation, isPrimary, isActive } = result.data;

            // Check if employee exists
            const employee = await prisma.employeeProfile.findUnique({
                where: { id: employeeId }
            });

            if (!employee) {
                return NextResponse.json(
                    { error: 'Employee not found' },
                    { status: 404 }
                );
            }

            // If setting as primary, unset other primary designations
            if (isPrimary) {
                await prisma.employeeCompanyDesignation.updateMany({
                    where: {
                        employeeId,
                        isPrimary: true
                    },
                    data: {
                        isPrimary: false
                    }
                });
            }

            // Create or update the designation
            const companyDesignation = await prisma.employeeCompanyDesignation.upsert({
                where: {
                    employeeId_companyId: {
                        employeeId,
                        companyId
                    }
                },
                update: {
                    designation,
                    isPrimary,
                    isActive
                },
                create: {
                    employeeId,
                    companyId,
                    designation,
                    isPrimary,
                    isActive
                },
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                            employeeIdPrefix: true
                        }
                    }
                }
            });

            return NextResponse.json(companyDesignation);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// PATCH: Update designation for a specific company
export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR'],
    async (req: NextRequest, user, { params }: { params: { id: string } }) => {
        try {
            const employeeId = params.id;
            const body = await req.json();
            const { designationId, ...updateData } = body;

            if (!designationId) {
                return NextResponse.json(
                    { error: 'Designation ID is required' },
                    { status: 400 }
                );
            }

            // If setting as primary, unset other primary designations
            if (updateData.isPrimary) {
                await prisma.employeeCompanyDesignation.updateMany({
                    where: {
                        employeeId,
                        isPrimary: true,
                        id: { not: designationId }
                    },
                    data: {
                        isPrimary: false
                    }
                });
            }

            const updated = await prisma.employeeCompanyDesignation.update({
                where: { id: designationId },
                data: updateData,
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                            employeeIdPrefix: true
                        }
                    }
                }
            });

            return NextResponse.json(updated);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// DELETE: Remove employee from a company
export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR'],
    async (req: NextRequest, user, { params }: { params: { id: string } }) => {
        try {
            const employeeId = params.id;
            const { searchParams } = new URL(req.url);
            const designationId = searchParams.get('designationId');

            if (!designationId) {
                return NextResponse.json(
                    { error: 'Designation ID is required' },
                    { status: 400 }
                );
            }

            await prisma.employeeCompanyDesignation.delete({
                where: { id: designationId }
            });

            return NextResponse.json({ success: true });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
