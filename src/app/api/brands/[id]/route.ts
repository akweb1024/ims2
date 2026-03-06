import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { logger } from '@/lib/logger';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'FINANCE_ADMIN', 'MANAGER'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await req.json();
        const { name, logoUrl, companyLogoUrl, tagline, address, email, website, brandRelationType } = body;

        const brand = await prisma.brand.update({
            where: { id },
            data: {
                ...(name && { name }),
                logoUrl,
                companyLogoUrl,
                tagline,
                address,
                email,
                website,
                brandRelationType,
                legalEntityName: body.legalEntityName,
                gstin: body.gstin,
                cinNo: body.cinNo,
                panNo: body.panNo,
                iecCode: body.iecCode,
                bankName: body.bankName,
                bankAccountHolder: body.bankAccountHolder,
                bankAccountNumber: body.bankAccountNumber,
                bankIfscCode: body.bankIfscCode,
                bankSwiftCode: body.bankSwiftCode,
                paymentMode: body.paymentMode,
                regdOfficeAddress: body.regdOfficeAddress,
                salesOfficeAddress: body.salesOfficeAddress,
                invoiceTerms: body.invoiceTerms,
                invoicePrefix: body.invoicePrefix,
                proformaPrefix: body.proformaPrefix,
                invoiceNextNumber: body.invoiceNextNumber,
                proformaNextNumber: body.proformaNextNumber
            }
        });

        return NextResponse.json(brand);
    } catch (error) {
        logger.error('Update Brand Error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'FINANCE_ADMIN'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await prisma.brand.delete({
            where: { id }
        });

        return NextResponse.json({ message: 'Brand deleted successfully' });
    } catch (error) {
        logger.error('Delete Brand Error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
