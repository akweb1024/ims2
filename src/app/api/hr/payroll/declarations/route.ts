import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const employeeId = searchParams.get('employeeId');
            const fiscalYear = searchParams.get('fiscalYear') || "2023-24";

            // If employeeId is provided, requester must be admin/manager
            if (employeeId && employeeId !== 'self') {
                if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
                    return createErrorResponse('Forbidden', 403);
                }

                const declaration = await prisma.taxDeclaration.findFirst({
                    where: { employeeId, fiscalYear },
                    include: { proofs: true }
                });
                return NextResponse.json(declaration || {});
            }

            // Self view
            const profile = await prisma.employeeProfile.findUnique({
                where: { userId: user.id }
            });
            if (!profile) return createErrorResponse('Profile not found', 404);

            const declaration = await prisma.taxDeclaration.findFirst({
                where: { employeeId: profile.id, fiscalYear },
                include: { proofs: true }
            });

            return NextResponse.json(declaration || {
                regime: 'NEW',
                section80C: 0,
                section80D: 0,
                hraRentPaid: 0,
                status: 'DRAFT'
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { fiscalYear, regime, section80C, section80D, nps, hraRentPaid, homeLoanInterest, otherIncome, status } = body;

            const profile = await prisma.employeeProfile.findUnique({
                where: { userId: user.id }
            });
            if (!profile) return createErrorResponse('Profile not found', 404);

            const declaration = await prisma.taxDeclaration.upsert({
                where: {
                    // No unique constraint on employee+year in schema yet, but we'll use findFirst + update or create
                    id: body.id || 'new-id'
                },
                update: {
                    regime,
                    section80C: parseFloat(section80C || 0),
                    section80D: parseFloat(section80D || 0),
                    nps: parseFloat(nps || 0),
                    hraRentPaid: parseFloat(hraRentPaid || 0),
                    homeLoanInterest: parseFloat(homeLoanInterest || 0),
                    otherIncome: parseFloat(otherIncome || 0),
                    status: status || 'DRAFT'
                },
                create: {
                    employeeId: profile.id,
                    fiscalYear: fiscalYear || "2023-24",
                    regime: regime || 'NEW',
                    section80C: parseFloat(section80C || 0),
                    section80D: parseFloat(section80D || 0),
                    nps: parseFloat(nps || 0),
                    hraRentPaid: parseFloat(hraRentPaid || 0),
                    homeLoanInterest: parseFloat(homeLoanInterest || 0),
                    otherIncome: parseFloat(otherIncome || 0),
                    status: status || 'DRAFT'
                }
            });

            return NextResponse.json(declaration);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// Admin Approval
export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const { id, status, adminComment } = await req.json();

            if (!id || !status) return createErrorResponse('ID and Status required', 400);

            const updated = await prisma.taxDeclaration.update({
                where: { id },
                data: { status, adminComment }
            });

            return NextResponse.json(updated);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
