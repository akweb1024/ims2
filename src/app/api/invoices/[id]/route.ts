import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // 1. Verify Authentication
        const decoded = await getAuthenticatedUser();
        if (!decoded || !decoded.role) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // 2. Fetch Invoice
        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: {
                subscription: {
                    include: {
                        customerProfile: true,
                        items: {
                            include: {
                                journal: true,
                                plan: true
                            }
                        }
                    }
                },
                customerProfile: true,
                payments: true,
                company: {
                    select: {
                        id: true, name: true, legalEntityName: true, tagline: true,
                        address: true, email: true, phone: true, website: true, logoUrl: true,
                        gstin: true, stateCode: true, cinNo: true, panNo: true, iecCode: true,
                        bankName: true, bankAccountHolder: true, bankAccountNumber: true,
                        bankIfscCode: true, bankSwiftCode: true, paymentMode: true,
                        currency: true
                    }
                }
            }
        });

        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        // 3. Authorization Check
        if (decoded.role === 'CUSTOMER') {
            const customerUserId = invoice.subscription?.customerProfile?.userId || invoice.customerProfile?.userId;
            if (customerUserId !== decoded.id) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        return NextResponse.json(invoice);

    } catch (error: any) {
        console.error('Invoice Detail API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
