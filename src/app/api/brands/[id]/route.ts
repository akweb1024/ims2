import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { logger } from '@/lib/logger';
import { parseAutomationConfigInput } from '@/lib/document-automation';
import { ValidationError } from '@/lib/error-handler';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'FINANCE_ADMIN', 'MANAGER'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await req.json();
        const hasAutomationConfigUpdate =
            body.documentWebhookConfig !== undefined || body.documentEmailConfig !== undefined;

        if (hasAutomationConfigUpdate && decoded.role !== 'SUPER_ADMIN') {
            throw new ValidationError('Only SUPER_ADMIN can manage document automation configuration');
        }

        // Build the update payload from ONLY the keys the client actually sent.
        // Spreading every field unconditionally would overwrite existing columns
        // with null/defaults on a partial update (data loss).
        const data: Record<string, any> = {};
        const directFields = [
            'name', 'logoUrl', 'companyLogoUrl', 'tagline', 'address', 'email', 'website',
            'brandRelationType', 'legalEntityName', 'gstin', 'cinNo', 'panNo', 'iecCode',
            'bankName', 'bankAccountHolder', 'bankAccountNumber', 'bankIfscCode', 'bankSwiftCode',
            'paymentMode', 'regdOfficeAddress', 'salesOfficeAddress', 'invoiceTerms',
            'invoicePrefix', 'proformaPrefix', 'invoiceNextNumber', 'proformaNextNumber',
        ];
        for (const field of directFields) {
            if (body[field] !== undefined) data[field] = body[field];
        }
        if (body.invoiceEntityCode !== undefined) {
            data.invoiceEntityCode = String(body.invoiceEntityCode || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || null;
        }
        if (body.invoiceYearFormat !== undefined) {
            data.invoiceYearFormat = body.invoiceYearFormat === 'FY_SHORT' ? 'FY_SHORT' : 'CALENDAR';
        }
        if (body.documentWebhookConfig !== undefined) {
            data.documentWebhookConfig = parseAutomationConfigInput(body.documentWebhookConfig);
        }
        if (body.documentEmailConfig !== undefined) {
            data.documentEmailConfig = parseAutomationConfigInput(body.documentEmailConfig);
        }

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
                invoiceEntityCode: true,
                invoiceYearFormat: true,
                brandRelationType: true,
                documentWebhookConfig: true,
                documentEmailConfig: true,
            }
        });

        const brand = await prisma.brand.update({
            where: { id },
            data,
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
                        invoiceEntityCode: brand.invoiceEntityCode,
                        invoiceYearFormat: brand.invoiceYearFormat,
                        brandRelationType: brand.brandRelationType,
                        documentWebhookConfig: (brand as any).documentWebhookConfig,
                        documentEmailConfig: (brand as any).documentEmailConfig,
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

// Style guide accessibility compliance helper comment: aria-label placeholder label
