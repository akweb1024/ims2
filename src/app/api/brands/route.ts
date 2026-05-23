import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, ValidationError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { parseAutomationConfigInput } from '@/lib/document-automation';
import { resolveCompanyScope } from '@/lib/access-policy';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const companyId = await resolveCompanyScope(req, user, {
                required: true,
                fallbackToActiveCompany: true,
            });
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
            const normalizedEntityCode = String(body.invoiceEntityCode || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || null;
            const normalizedYearFormat = body.invoiceYearFormat === 'FY_SHORT' ? 'FY_SHORT' : 'CALENDAR';
            const normalizedDocumentWebhookConfig = parseAutomationConfigInput(body.documentWebhookConfig);
            const normalizedDocumentEmailConfig = parseAutomationConfigInput(body.documentEmailConfig);
            const hasAutomationConfigUpdate =
                body.documentWebhookConfig !== undefined || body.documentEmailConfig !== undefined;

            if (!name || !companyId) throw new ValidationError('Name and Company ID are required');
            if (hasAutomationConfigUpdate && user.role !== 'SUPER_ADMIN') {
                throw new ValidationError('Only SUPER_ADMIN can manage document automation configuration');
            }

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
                    proformaNextNumber: body.proformaNextNumber,
                    invoiceEntityCode: normalizedEntityCode,
                    invoiceYearFormat: normalizedYearFormat,
                    documentWebhookConfig: normalizedDocumentWebhookConfig,
                    documentEmailConfig: normalizedDocumentEmailConfig,
                }
            });

            logger.info('Brand created', { brandId: brand.id, createdBy: user.id });

            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'CREATE_INVOICE_CONFIG_BRAND',
                    entity: 'brand',
                    entityId: brand.id,
                    changes: {
                        after: {
                            legalEntityName: brand.legalEntityName,
                            gstin: brand.gstin,
                            stateCode: brand.stateCode,
                            bankName: brand.bankName,
                            bankAccountNumber: brand.bankAccountNumber,
                            bankIfscCode: brand.bankIfscCode,
                            invoicePrefix: brand.invoicePrefix,
                            proformaPrefix: brand.proformaPrefix,
                            invoiceNextNumber: brand.invoiceNextNumber,
                            proformaNextNumber: brand.proformaNextNumber,
                            invoiceEntityCode: brand.invoiceEntityCode,
                            invoiceYearFormat: brand.invoiceYearFormat,
                            brandRelationType: brand.brandRelationType,
                            documentWebhookConfig: (brand as any).documentWebhookConfig,
                            documentEmailConfig: (brand as any).documentEmailConfig,
                        }
                    }
                }
            });

            return NextResponse.json(brand, { status: 201 });
        } catch (error) {
            return handleApiError(error, req.nextUrl.pathname);
        }
    }
);

// Style guide accessibility compliance helper comment: aria-label placeholder label
