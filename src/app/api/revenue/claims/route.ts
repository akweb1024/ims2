import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';

export const GET = authorizedRoute(['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'TEAM_LEADER', 'FINANCE_ADMIN', 'HR'], async (req: NextRequest, user) => {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const employeeId = searchParams.get('employeeId');

        const where: any = {};

        // If not admin, restrict to their company
        const employee = await prisma.employeeProfile.findFirst({
            where: { userId: user.id }
        });

        if (user.role !== 'SUPER_ADMIN') {
            where.employee = { companyId: user.companyId };
        }

        if (status) where.status = status;
        if (employeeId) where.employeeId = employeeId;

        const claims = await prisma.revenueClaim.findMany({
            where,
            include: {
                revenueTransaction: true,
                employee: {
                    include: {
                        user: { select: { name: true, email: true } }
                    }
                },
                workReport: { select: { date: true, title: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(claims);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const POST = authorizedRoute(['ADMIN', 'MANAGER', 'TEAM_LEADER', 'HR', 'EMPLOYEE', 'FINANCE_ADMIN'], async (req: NextRequest, user) => {
    try {
        const body = await req.json();
        const { revenueTransactionId, employeeId, workReportId, claimAmount, claimReason } = body;

        // Verify transaction exists and belongs to company
        const transaction = await prisma.revenueTransaction.findUnique({
            where: { id: revenueTransactionId }
        });

        if (!transaction || transaction.companyId !== user.companyId) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
        }

        // Check if employee already claimed this transaction
        const existing = await prisma.revenueClaim.findFirst({
            where: {
                revenueTransactionId,
                employeeId,
                status: { not: 'REJECTED' }
            }
        });

        if (existing) {
            return NextResponse.json({ error: 'You have already submitted a claim for this transaction.' }, { status: 400 });
        }

        const claim = await prisma.revenueClaim.create({
            data: {
                revenueTransactionId,
                employeeId,
                workReportId,
                claimAmount: Number(claimAmount),
                claimReason,
                status: 'PENDING'
            }
        });

        return NextResponse.json(claim);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const PUT = authorizedRoute(['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'FINANCE_ADMIN'], async (req: NextRequest, user) => {
    try {
        const body = await req.json();
        const { id, status, reviewNotes } = body;

        if (!id) return NextResponse.json({ error: 'Claim ID required' }, { status: 400 });

        const claim = await prisma.revenueClaim.update({
            where: { id },
            data: {
                status,
                reviewNotes,
                reviewedBy: user.id,
                reviewedAt: new Date()
            },
            include: {
                revenueTransaction: true
            }
        });

        // If approved, update work report revenue if linked
        if (status === 'APPROVED' && claim.workReportId) {
            // Recalculate work report revenue from all approved claims
            const allApprovedClaims = await prisma.revenueClaim.findMany({
                where: {
                    workReportId: claim.workReportId,
                    status: 'APPROVED'
                }
            });

            const totalRevenue = allApprovedClaims.reduce((sum: number, c: any) => sum + Number(c.claimAmount), 0);

            await prisma.workReport.update({
                where: { id: claim.workReportId },
                data: { revenueGenerated: totalRevenue }
            });
        }

        return NextResponse.json(claim);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
