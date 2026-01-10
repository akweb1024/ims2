import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

// Helper to replace placeholders
const hydrateTemplate = (content: string, vars: Record<string, string>) => {
    let output = content;
    Object.keys(vars).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        output = output.replace(regex, vars[key] || '');
    });
    return output;
};

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { templateId, employeeIds, filters } = body;

            if (!templateId) return createErrorResponse('Template ID required', 400);

            const template = await prisma.documentTemplate.findUnique({ where: { id: templateId } });
            if (!template) return createErrorResponse('Template not found', 404);

            let targetEmployees: any[] = [];

            // 1. Fetch Target Employees
            if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
                targetEmployees = await prisma.employeeProfile.findMany({
                    where: { id: { in: employeeIds } },
                    include: { user: true }
                });
            } else if (filters) {
                const whereClause: any = {
                    user: {
                        isActive: true, // Only active employees usually
                        companyId: user.companyId // Same company
                    }
                };

                // For MVP Bulk: If 'all' is true, just get all in company
                if (filters.all) {
                    // No extra filters needed beyond company check
                }

                targetEmployees = await prisma.employeeProfile.findMany({
                    where: whereClause,
                    include: { user: true }
                });
            }

            if (targetEmployees.length === 0) {
                return createErrorResponse('No employees found for the given criteria', 404);
            }

            // Fetch Company Context once
            const company = await prisma.company.findUnique({ where: { id: template.companyId } });

            const results = [];

            // 2. Issue Documents Loop
            for (const employee of targetEmployees) {
                try {
                    // Prepare Variables
                    const vars = {
                        name: employee.user.name || employee.user.email.split('@')[0],
                        email: employee.user.email,
                        designation: employee.designation || 'Specialist',
                        date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
                        salary: (employee.baseSalary || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' }),
                        address: employee.address || 'Address not provided',
                        joiningDate: employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString('en-GB') : 'Date to be decided',
                        companyName: company?.name || 'STM Journal Solutions',
                        companyAddress: company?.address || 'Noida, UP',
                    };

                    const resolvedContent = hydrateTemplate(template.content, vars);

                    const doc = await prisma.digitalDocument.create({
                        data: {
                            templateId,
                            employeeId: employee.id,
                            title: template.title,
                            content: resolvedContent,
                            status: 'PENDING'
                        }
                    });
                    results.push({ id: employee.id, status: 'SUCCESS', docId: doc.id });
                } catch (err) {
                    console.error(`Failed for ${employee.id}`, err);
                    results.push({ id: employee.id, status: 'FAILED' });
                }
            }

            return NextResponse.json({
                success: true,
                total: targetEmployees.length,
                results
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
