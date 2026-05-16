import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/error-handler';

function isValidAccessCode(providedCode: string | null) {
    const expectedCode = process.env.PUBLIC_INVOICE_ACCESS_CODE;
    if (!expectedCode) return false;
    return providedCode === expectedCode;
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const accessCode = searchParams.get('accessCode');

        if (!process.env.PUBLIC_INVOICE_ACCESS_CODE) {
            return NextResponse.json({ error: 'Public invoice access is not configured.' }, { status: 503 });
        }

        if (!isValidAccessCode(accessCode)) {
            return NextResponse.json({ error: 'Unauthorized. Invalid access code.' }, { status: 401 });
        }

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
                },
                brand: true
            }
        });

        if (!invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
        }

        return NextResponse.json(invoice);
    } catch (error) {
        return handleApiError(error, 'Failed to fetch public invoice');
    }
}
