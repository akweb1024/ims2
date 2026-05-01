import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/auth-legacy';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const POST = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { companyId } = body;
            const isAllCompany = companyId === 'ALL';

            if (!companyId) {
                return createErrorResponse('Company ID is required', 400);
            }

            // Verify access
            let hasAccess = false;

            if (isAllCompany) {
                if (user.role === 'SUPER_ADMIN') {
                    hasAccess = true;
                } else {
                    const userWithCompanies = await prisma.user.findUnique({
                        where: { id: user.id },
                        select: { companyId: true, companies: { select: { id: true } } }
                    });
                    const accessible = new Set<string>();
                    if (userWithCompanies?.companyId) accessible.add(userWithCompanies.companyId);
                    userWithCompanies?.companies.forEach(c => accessible.add(c.id));
                    hasAccess = accessible.size > 1;
                }
            } else if (user.role === 'SUPER_ADMIN') {
                const company = await prisma.company.findUnique({ where: { id: companyId } });
                if (company) hasAccess = true;
            } else {
                const userWithCompanies = await prisma.user.findUnique({
                    where: { id: user.id },
                    include: { companies: { where: { id: companyId } } }
                });
                if (userWithCompanies?.companies.length || userWithCompanies?.companyId === companyId) {
                    hasAccess = true;
                }
            }

            if (!hasAccess) {
                return createErrorResponse('Forbidden: No access to this company', 403);
            }

            // Update active company in User model
            // For "ALL", we set companyId to null
            await prisma.user.update({
                where: { id: user.id },
                data: { companyId: isAllCompany ? null : companyId }
            });

            // Generate new token with updated companyId
            const newToken = generateToken({
                id: user.id,
                email: user.email,
                role: user.role,
                companyId: isAllCompany ? undefined : companyId
            });

            return NextResponse.json({
                success: true,
                token: newToken,
                message: 'Company selected successfully'
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
