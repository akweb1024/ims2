import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';

// Helper to generate transaction number
async function generateTransactionNumber(companyId: string) {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');

    // Count transactions for today to increment
    const count = await prisma.revenueTransaction.count({
        where: {
            companyId,
            createdAt: {
                gte: new Date(today.setHours(0, 0, 0, 0)),
                lte: new Date(today.setHours(23, 59, 59, 999))
            }
        }
    });

    return `RT-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;
}

export const GET = authorizedRoute(['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'TEAM_LEADER', 'FINANCE_ADMIN', 'HR'], async (req: NextRequest, user) => {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const method = searchParams.get('method');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const where: any = {
            companyId: user.companyId
        };

        if (status) where.status = status;
        if (method) where.paymentMethod = method;
        if (startDate && endDate) {
            where.paymentDate = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }

        const transactions = await prisma.revenueTransaction.findMany({
            where,
            include: {
                claimedBy: {
                    select: {
                        user: { select: { name: true, email: true } }
                    }
                },
                approvedBy: {
                    select: {
                        user: { select: { name: true } }
                    }
                },
                department: { select: { name: true } },
                claims: {
                    include: {
                        employee: {
                            select: {
                                user: { select: { name: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { paymentDate: 'desc' }
        });

        return NextResponse.json(transactions);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const POST = authorizedRoute(['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'TEAM_LEADER', 'FINANCE_ADMIN'], async (req: NextRequest, user) => {
    try {
        const body = await req.json();
        const {
            amount,
            paymentMethod,
            paymentDate,
            customerName,
            customerEmail,
            customerPhone,
            referenceNumber,
            bankName,
            proofDocument,
            claimedByEmployeeId,
            departmentId,
            description,
            notes,
            customerProfileId,
            institutionId,
            invoiceId
        } = body;

        // Check for duplicates based on referenceNumber if provided
        if (referenceNumber) {
            const existing = await prisma.revenueTransaction.findFirst({
                where: {
                    companyId: user.companyId as string,
                    referenceNumber,
                    paymentMethod
                }
            });
            if (existing) {
                return NextResponse.json({ error: 'A transaction with this reference number already exists.' }, { status: 400 });
            }
        }

        const transactionNumber = await generateTransactionNumber(user.companyId as string);

        const transaction = await prisma.revenueTransaction.create({
            data: {
                companyId: user.companyId as string,
                transactionNumber,
                amount: Number(amount),
                paymentMethod,
                paymentDate: new Date(paymentDate),
                customerName,
                customerEmail,
                customerPhone,
                referenceNumber,
                bankName,
                proofDocument,
                claimedByEmployeeId,
                departmentId,
                description,
                notes,
                customerProfileId,
                institutionId,
                invoiceId,
                createdBy: user.id
            }
        });

        // Automatically create a claim if claimedByEmployeeId is provided
        if (claimedByEmployeeId) {
            await prisma.revenueClaim.create({
                data: {
                    revenueTransactionId: transaction.id,
                    employeeId: claimedByEmployeeId,
                    claimAmount: Number(amount),
                    claimReason: 'Initial claim during transaction creation',
                    status: 'PENDING'
                }
            });
        }

        return NextResponse.json(transaction);
    } catch (error: any) {
        console.error('Error creating transaction:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

export const PUT = authorizedRoute(['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'FINANCE_ADMIN'], async (req: NextRequest, user) => {
    try {
        const body = await req.json();
        const { id, status, verificationStatus, claimStatus, reviewNotes } = body;

        if (!id) return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 });

        const data: any = {};
        if (status) data.status = status;
        if (verificationStatus) {
            data.verificationStatus = verificationStatus;
            if (verificationStatus === 'VERIFIED') {
                data.verifiedAt = new Date();
                data.approvedByManagerId = user.id; // Usually user.id is User ID, need Employee Profile ID if possible
            }
        }

        const transaction = await prisma.revenueTransaction.update({
            where: { id },
            data
        });

        return NextResponse.json(transaction);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
