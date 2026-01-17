import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

// GET all global departments
export const GET = authorizedRoute(['SUPER_ADMIN', 'ADMIN'], async () => {
    try {
        const globalDepts = await prisma.globalDepartment.findMany({
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(globalDepts);
    } catch (error) {
        return createErrorResponse(error);
    }
});

// POST - Create a new global department and optionally sync to companies
// OR Sync existing ones to companies
export const POST = authorizedRoute(['SUPER_ADMIN'], async (req: NextRequest) => {
    try {
        const body = await req.json();
        const { id, name, code, description, syncCompanyIds } = body;

        let globalDept;

        if (id) {
            // Updating Existing Global
            globalDept = await prisma.globalDepartment.update({
                where: { id },
                data: { name, code, description }
            });
        } else {
            // Creating New Global
            // Check if name exists
            const existing = await prisma.globalDepartment.findUnique({ where: { name } });
            if (existing) return createErrorResponse('Global Department with this name already exists', 400);

            globalDept = await prisma.globalDepartment.create({
                data: { name, code, description }
            });
        }

        // SYNC LOGIC
        // If companies are selected, ensure they have this department
        if (Array.isArray(syncCompanyIds) && syncCompanyIds.length > 0) {
            const operations = syncCompanyIds.map(async (companyId) => {
                // Check if company already has a department with this name
                const existingCompDept = await prisma.department.findUnique({
                    where: {
                        companyId_code: {
                            companyId: companyId,
                            code: code || `DEPT-${name.substring(0, 3).toUpperCase()}` // Fallback if no code. 
                            // Wait, schema unique is companyId+Code. If code is null?
                            // Actually unique constraint is @@unique([companyId, code]).
                            // If code is null, multiple nulls might be allowed or unique constraint fails on SQL.
                            // Prisma usually treats nulls as distinct or not depending on DB. Postgres treats multiple nulls as unique.
                            // BUT we should rely on NAME uniqueness within company ideally, but Schema says Code.
                            // Let's check Schema... existing Dept has @@unique([companyId, code]).
                        }
                    }
                });

                // ISSUE: We need to check by NAME because code might be different or null. 
                // We want to avoid duplicates by NAME concept.

                const existingByName = await prisma.department.findFirst({
                    where: {
                        companyId,
                        name: { equals: globalDept.name, mode: 'insensitive' }
                    }
                });

                if (!existingByName) {
                    return prisma.department.create({
                        data: {
                            companyId,
                            name: globalDept.name,
                            code: globalDept.code || globalDept.name.substring(0, 10).toUpperCase().replace(/\s/g, '_'),
                            description: globalDept.description
                        }
                    });
                }
                return null;
            });

            await Promise.all(operations);
        }

        return NextResponse.json(globalDept);
    } catch (error) {
        return createErrorResponse(error);
    }
});
