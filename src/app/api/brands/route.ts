import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, ValidationError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const companyId = searchParams.get('companyId') || user.companyId;

            if (!companyId) throw new ValidationError('Company ID is required');

            const brands = await prisma.brand.findMany({
                where: { companyId },
                orderBy: { name: 'asc' }
            });

            return NextResponse.json(brands);
        } catch (error) {
            return handleApiError(error, req.nextUrl.pathname);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'FINANCE_ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { name, companyId, logoUrl, companyLogoUrl, tagline, address, email, website, brandRelationType } = body;

            if (!name || !companyId) throw new ValidationError('Name and Company ID are required');

            const brand = await (prisma.brand as any).create({
                data: {
                    name,
                    companyId,
                    logoUrl,
                    companyLogoUrl,
                    tagline,
                    address,
                    email,
                    website,
                    brandRelationType: brandRelationType || 'A Brand of',
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
                    paymentMode: body.paymentMode || 'Online',
                    regdOfficeAddress: body.regdOfficeAddress,
                    salesOfficeAddress: body.salesOfficeAddress,
                    invoiceTerms: body.invoiceTerms,
                    invoicePrefix: body.invoicePrefix,
                    proformaPrefix: body.proformaPrefix,
                    invoiceNextNumber: body.invoiceNextNumber,
                    proformaNextNumber: body.proformaNextNumber
                }
            });

            logger.info('Brand created', { brandId: brand.id, createdBy: user.id });

            return NextResponse.json(brand, { status: 201 });
        } catch (error) {
            return handleApiError(error, req.nextUrl.pathname);
        }
    }
);


