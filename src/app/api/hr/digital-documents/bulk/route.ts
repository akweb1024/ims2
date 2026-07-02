import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { buildLetterVars, hydrate } from '@/lib/services/documents/letterVars';

// POST: Issue one template to many employees at once — either an explicit `employeeIds`
// list, or a `filters` object ({} = all active in company, or by designation / employeeType).
// Uses the SAME shared hydrator + per-employee company sourcing as the single-issue route
// (digital-documents POST), so a bulk-issued letter is identical to a single-issued one.
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { templateId, employeeIds, filters } = body;

            if (!templateId) return createErrorResponse('Template ID required', 400);

            const template = await prisma.documentTemplate.findUnique({ where: { id: templateId } });
            if (!template) return createErrorResponse('Template not found', 404);

            // Resolve target employees
            let targetEmployees: any[] = [];
            if (Array.isArray(employeeIds) && employeeIds.length > 0) {
                targetEmployees = await prisma.employeeProfile.findMany({
                    where: { id: { in: employeeIds } },
                    include: { user: true },
                });
            } else if (filters) {
                const where: any = { user: { isActive: true, companyId: user.companyId } };
                if (typeof filters.designation === 'string' && filters.designation) where.designation = filters.designation;
                if (typeof filters.employeeType === 'string' && filters.employeeType) where.employeeType = filters.employeeType;
                targetEmployees = await prisma.employeeProfile.findMany({ where, include: { user: true } });
            }

            if (targetEmployees.length === 0) return createErrorResponse('No employees matched the criteria', 404);

            const results = [];
            for (const employee of targetEmployees) {
                try {
                    // Company from the EMPLOYEE's own record, not the HR actor's — correct
                    // letterhead when a group admin issues across companies.
                    const employeeCompanyId = (employee.user as any)?.companyId || user.companyId || null;
                    const company = employeeCompanyId ? await prisma.company.findUnique({ where: { id: employeeCompanyId } }) : null;
                    const resolvedContent = hydrate(template.content, buildLetterVars(employee, company));

                    const doc = await prisma.digitalDocument.create({
                        data: {
                            templateId,
                            employeeId: employee.id,
                            title: template.title,
                            content: resolvedContent,
                            status: 'PENDING',
                        },
                    });
                    results.push({ employeeId: employee.id, status: 'SUCCESS', docId: doc.id });
                } catch (err) {
                    console.error(`Bulk issue failed for ${employee.id}`, err);
                    results.push({ employeeId: employee.id, status: 'FAILED' });
                }
            }

            return NextResponse.json({ success: true, total: targetEmployees.length, results });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
