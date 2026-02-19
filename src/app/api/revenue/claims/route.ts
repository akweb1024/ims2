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
        const { revenueTransactionId: providedTxId, paymentId, employeeId, workReportId, claimAmount, claimReason } = body;
        let revenueTransactionId = providedTxId;

        // Logic to handle claiming via Payment ID
        if (!revenueTransactionId && paymentId) {
            // Check if payment exists
            const payment = await prisma.payment.findFirst({
                where: {
                    OR: [
                        { id: paymentId },
                        { razorpayPaymentId: paymentId }
                    ]
                },
                include: { revenueTransactions: true }
            });

            if (!payment) {
                return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
            }

            // If transaction exists, use it
            if (payment.revenueTransactions && payment.revenueTransactions.length > 0) {
                revenueTransactionId = payment.revenueTransactions[0].id;
            } else {
                // Determine companyId: Payment -> User -> Fallback
                let companyId = payment.companyId;
                if (!companyId) {
                    // Try to infer from authenticated user if they belong to the same context (risky if admin looking at global)
                    // But typically claims are made by users in their own company.
                    companyId = user.companyId || null;
                }

                if (!companyId) {
                    return NextResponse.json({ error: 'Cannot determine company context for this payment' }, { status: 400 });
                }

                // Create new RevenueTransaction from Payment
                const newTx = await prisma.revenueTransaction.create({
                    data: {
                        companyId: companyId as string,
                        transactionNumber: payment.razorpayPaymentId || `PAY-${payment.id.substring(0, 8)}`,
                        amount: payment.amount,
                        currency: payment.currency,
                        paymentMethod: payment.paymentMethod || 'ONLINE',
                        paymentDate: payment.paymentDate,
                        paymentId: payment.id,
                        description: payment.notes || 'Razorpay Payment',
                        status: 'PENDING', // Default to PENDING for claims
                        verificationStatus: 'UNVERIFIED'
                    }
                });
                revenueTransactionId = newTx.id;
            }
        }

        if (!revenueTransactionId) {
            return NextResponse.json({ error: 'Transaction ID or Payment ID required' }, { status: 400 });
        }

        // Verify transaction exists and belongs to company (or user has access)
        const transaction = await prisma.revenueTransaction.findUnique({
            where: { id: revenueTransactionId }
        });

        // Loose check: User should be able to claim if they are in the same company.
        // Or if super admin.
        if (!transaction || (user.role !== 'SUPER_ADMIN' && transaction.companyId !== user.companyId)) {
            return NextResponse.json({ error: 'Transaction not found or access denied' }, { status: 404 });
        }

        // Resolve Employee ID
        let targetEmployeeId = employeeId;
        if (!targetEmployeeId) {
            const profile = await prisma.employeeProfile.findUnique({
                where: { userId: user.id }
            });
            if (profile) {
                targetEmployeeId = profile.id;
            } else {
                // Auto-create profile if missing? Or error?
                // For now, let's try to find or create to ensure we have an ID
                const newProfile = await prisma.employeeProfile.create({
                    data: { userId: user.id }
                });
                targetEmployeeId = newProfile.id;
            }
        }

        if (!targetEmployeeId) return NextResponse.json({ error: 'Employee profile required' }, { status: 400 });

        // Resolve Claim Amount
        let finalClaimAmount = Number(claimAmount);
        if (isNaN(finalClaimAmount) || finalClaimAmount <= 0) {
            finalClaimAmount = transaction.amount;
        }

        // Check if employee already claimed this transaction
        const existing = await prisma.revenueClaim.findFirst({
            where: {
                revenueTransactionId,
                employeeId: targetEmployeeId,
                status: { not: 'REJECTED' }
            }
        });

        if (existing) {
            return NextResponse.json({ error: 'You have already submitted a claim for this transaction.' }, { status: 400 });
        }

        const claim = await prisma.revenueClaim.create({
            data: {
                revenueTransactionId,
                employeeId: targetEmployeeId,
                workReportId,
                claimAmount: finalClaimAmount,
                claimReason: claimReason || 'Manual Claim',
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

        // If approved, update work report revenue if linked AND verify the transaction
        if (status === 'APPROVED') {
            // 1. Verify the underlying Revenue Transaction
            if (claim.revenueTransactionId) {
                await prisma.revenueTransaction.update({
                    where: { id: claim.revenueTransactionId },
                    data: {
                        verificationStatus: 'VERIFIED',
                        status: 'VERIFIED', // Ensure main status reflects this too
                        verifiedAt: new Date(),
                        approvedByManagerId: user.id
                    }
                });
            }

            // 2. Update Work Report Revenue
            if (claim.workReportId) {
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
        }

        return NextResponse.json(claim);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
