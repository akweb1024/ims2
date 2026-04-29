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

        const before = await prisma.brand.findUnique({
            where: { id },
            select: {
                legalEntityName: true,
                gstin: true,
                bankName: true,
                bankAccountNumber: true,
                bankIfscCode: true,
                invoicePrefix: true,
                proformaPrefix: true,
                invoiceNextNumber: true,
                proformaNextNumber: true,
                brandRelationType: true,
            }
        });

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

        await prisma.auditLog.create({
            data: {
                userId: decoded.id,
                action: 'UPDATE_INVOICE_CONFIG_BRAND',
                entity: 'brand',
                entityId: id,
                changes: {
                    before,
                    after: {
                        legalEntityName: brand.legalEntityName,
                        gstin: brand.gstin,
                        bankName: brand.bankName,
                        bankAccountNumber: brand.bankAccountNumber,
                        bankIfscCode: brand.bankIfscCode,
                        invoicePrefix: brand.invoicePrefix,
                        proformaPrefix: brand.proformaPrefix,
                        invoiceNextNumber: brand.invoiceNextNumber,
                        proformaNextNumber: brand.proformaNextNumber,
                        brandRelationType: brand.brandRelationType,
                    }
                }
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
