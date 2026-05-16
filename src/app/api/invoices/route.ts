import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, ValidationError, NotFoundError } from '@/lib/error-handler';
import { InvoiceStatus } from '@/types';
import { FinanceService } from '@/lib/services/finance';
import { logger } from '@/lib/logger';
import { generateInvoiceNumbers } from '@/lib/invoice-number';
import { calculateInvoiceTaxBreakdown } from '@/lib/invoice-tax';
import { applyInvoiceStockReservations } from '@/lib/invoice-stock-reservation';
import { validateInvoiceConfig } from '@/lib/invoice-config';
import { loadInvoiceAutomationPayload, triggerDocumentAutomation } from '@/lib/document-automation';
import { assertCompanyAccess, resolveCompanyScope } from '@/lib/access-policy';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
    try {
        // Parse Query Parameters
        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
        const status = searchParams.get('status') as InvoiceStatus | null;
        const search = searchParams.get('search') || '';

        const skip = (page - 1) * limit;

        // 3. Build Filter
        const where: any = {};
        const scopedCompanyId = await resolveCompanyScope(req, user, {
            required: false,
            fallbackToActiveCompany: true,
        });
        if (scopedCompanyId) {
            where.companyId = scopedCompanyId;
        }

        if (status) {
            where.status = status;
        }

        const andFilters: any[] = [];

        if (search) {
            andFilters.push({
                OR: [
                    { invoiceNumber: { contains: search, mode: 'insensitive' } },
                    { subscription: { customerProfile: { name: { contains: search, mode: 'insensitive' } } } },
                    { subscription: { customerProfile: { organizationName: { contains: search, mode: 'insensitive' } } } },
                    { customerProfile: { name: { contains: search, mode: 'insensitive' } } },
                    { customerProfile: { organizationName: { contains: search, mode: 'insensitive' } } }
                ]
            });
        }

        // Role-based filtering: Customers only see their own invoices
        if (user.role === 'CUSTOMER') {
            const profile = await prisma.customerProfile.findUnique({ where: { userId: user.id } });
            if (profile) {
                andFilters.push({
                    OR: [
                        { customerProfileId: profile.id },
                        { subscription: { customerProfileId: profile.id } }
                    ]
                });
            } else {
                return NextResponse.json({ data: [], pagination: { page, limit, total: 0, totalPages: 0 } });
            }
        }

        if (andFilters.length > 0) {
            where.AND = andFilters;
        }

        // 4. Fetch Invoices
        const [invoices, total] = await Promise.all([
            prisma.invoice.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    customerProfile: { // Direct link
                        select: {
                            id: true,
                            name: true,
                            organizationName: true
                        }
                    },
                    brand: true,
                    subscription: {
                        include: {
                            customerProfile: {
                                select: {
                                    id: true,
                                    name: true,
                                    organizationName: true
                                }
                            }
                        }
                    },
                    dispatchOrders: true
                }
            }),
            prisma.invoice.count({ where })
        ]);

        return NextResponse.json({
            data: invoices,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });

    } catch (error: any) {
        return handleApiError(error, req.nextUrl.pathname);
    }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'FINANCE_ADMIN', 'MANAGER', 'ADMIN', 'EXECUTIVE'],
    async (req: NextRequest, user) => {
    try {
        const body = await req.json();
        const { customerProfileId, brandId, companyId, couponId, couponCode, discountType, discountValue, discountAmount,
                dueDate, lineItems, description, purchaseOrderNumber, invoiceDate, taxRate = 0, currency = 'INR' } = body;

        const normalizedPurchaseOrderNumber =
            typeof purchaseOrderNumber === 'string' ? purchaseOrderNumber.trim() : null;
        const normalizedInvoiceDate =
            typeof invoiceDate === 'string' ? invoiceDate.trim() : null;

        if (!customerProfileId || !lineItems || lineItems.length === 0) {
            throw new ValidationError('customerProfileId and at least one lineItem are required');
        }

        const processedItems = lineItems.map((item: any) => ({
            ...item,
            amount: Number(item.quantity) * Number(item.price),
        }));

        const customer = await prisma.customerProfile.findUnique({
            where: { id: customerProfileId },
            include: {
                institution: {
                    select: { type: true }
                }
            }
        });

        if (!customer) throw new NotFoundError('Customer');
        const targetCompanyId = companyId || customer.companyId || user.companyId;
        if (!targetCompanyId) {
            throw new ValidationError('Company context is required');
        }
        await assertCompanyAccess(user, targetCompanyId, 'create invoices for this company');
        if (customer.companyId !== targetCompanyId) {
            throw new ValidationError('Selected customer does not belong to the selected company');
        }

        // Fetch Company for Snapshots and Number Generation
        const company = await prisma.company.findUnique({
            where: { id: targetCompanyId as string }
        });
        
        if (!company) throw new NotFoundError('Company');

        const invoiceConfigToValidate: any = brandId
            ? await prisma.brand.findFirst({
                where: { id: brandId, companyId: targetCompanyId },
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
                },
            })
            : {
                legalEntityName: company.legalEntityName,
                gstin: company.gstin,
                stateCode: company.stateCode,
                bankName: company.bankName,
                bankAccountNumber: company.bankAccountNumber,
                bankIfscCode: company.bankIfscCode,
                invoicePrefix: company.invoicePrefix,
                proformaPrefix: company.proformaPrefix,
                invoiceNextNumber: company.invoiceNextNumber,
                proformaNextNumber: company.proformaNextNumber,
            };

        if (brandId && !invoiceConfigToValidate) {
            throw new ValidationError('Selected brand for invoice was not found');
        }
        if (brandId && invoiceConfigToValidate) {
            invoiceConfigToValidate.stateCode = company.stateCode;
        }
        const configCheck = validateInvoiceConfig(invoiceConfigToValidate);
        if (!configCheck.valid) {
            throw new ValidationError(
                `Invoice configuration is incomplete. Missing: ${configCheck.missing.join(', ')}`,
            );
        }

        let brandSnapshot: any = {
            brandRelationType: company?.brandRelationType || 'A Brand of' as string,
            companyLogoUrl: company?.invoiceCompanyLogoUrl || company?.logoUrl || null,
            brandLogoUrl: company?.logoUrl || null,
            brandAddress: company?.address || null,
            brandEmail: company?.email || null,
            brandWebsite: company?.website || null,
            brandLegalName: company?.legalEntityName || company?.name || null,
            brandTagline: company?.tagline || null,
            brandGstin: company?.gstin || null,
            brandCin: company?.cinNo || null,
            brandPan: company?.panNo || null,
            brandIec: company?.iecCode || null,
            brandBankName: company?.bankName || null,
            brandBankHolder: company?.bankAccountHolder || null,
            brandBankNumber: company?.bankAccountNumber || null,
            brandBankIfsc: company?.bankIfscCode || null,
            brandBankSwift: company?.bankSwiftCode || null,
            brandPaymentMode: company?.paymentMode || 'Online',
            brandRegdOfficeAddress: (company as any)?.regdOfficeAddress || null,
            brandSalesOfficeAddress: (company as any)?.salesOfficeAddress || null,
            brandInvoiceTerms: (company as any)?.invoiceTerms || null
        };

        if (brandId) {
            const brand = await prisma.brand.findFirst({
                where: { id: brandId, companyId: targetCompanyId }
            });
            if (brand) {
                // If brand has its own details, override the defaults
                brandSnapshot = {
                    brandRelationType: brand.brandRelationType || brandSnapshot.brandRelationType,
                    brandLogoUrl: brand.logoUrl || brandSnapshot.brandLogoUrl,
                    companyLogoUrl: brand.companyLogoUrl || brandSnapshot.companyLogoUrl,
                    brandAddress: brand.address || brandSnapshot.brandAddress,
                    brandEmail: brand.email || brandSnapshot.brandEmail,
                    brandWebsite: brand.website || brandSnapshot.brandWebsite,
                    brandLegalName: (brand as any).legalEntityName || brand.name || (brandSnapshot as any).brandLegalName,
                    brandTagline: (brand as any).tagline || (brandSnapshot as any).brandTagline,
                    brandGstin: (brand as any).gstin || (brandSnapshot as any).brandGstin,
                    brandCin: (brand as any).cinNo || (brandSnapshot as any).brandCin,
                    brandPan: (brand as any).panNo || (brandSnapshot as any).brandPan,
                    brandIec: (brand as any).iecCode || (brandSnapshot as any).brandIec,
                    brandBankName: (brand as any).bankName || (brandSnapshot as any).brandBankName,
                    brandBankHolder: (brand as any).bankAccountHolder || (brandSnapshot as any).brandBankHolder,
                    brandBankNumber: (brand as any).bankAccountNumber || (brandSnapshot as any).brandBankNumber,
                    brandBankIfsc: (brand as any).bankIfscCode || (brandSnapshot as any).brandBankIfsc,
                    brandBankSwift: (brand as any).bankSwiftCode || (brandSnapshot as any).brandBankSwift,
                    brandPaymentMode: (brand as any).paymentMode || (brandSnapshot as any).brandPaymentMode,
                    brandRegdOfficeAddress: (brand as any).regdOfficeAddress || (brandSnapshot as any).brandRegdOfficeAddress,
                    brandSalesOfficeAddress: (brand as any).salesOfficeAddress || (brandSnapshot as any).brandSalesOfficeAddress,
                    brandInvoiceTerms: (brand as any).invoiceTerms || (brandSnapshot as any).brandInvoiceTerms
                };
            }
        }

        const productIds: string[] = Array.from(
            new Set(
                processedItems
                    .map((item: any) => item.productId)
                    .filter((value: any): value is string => typeof value === 'string' && value.length > 0)
            )
        );
        const productMetadata = new Map<
            string,
            {
                id: string;
                category?: string | null;
                tags?: string[] | null;
                taxRate?: number | null;
                productAttributes?: any;
            }
        >();

        if (productIds.length > 0) {
            const products = await prisma.invoiceProduct.findMany({
                where: { id: { in: productIds } },
                select: { id: true, category: true, tags: true, taxRate: true, productAttributes: true }
            });
            products.forEach((product) => {
                productMetadata.set(product.id, {
                    id: product.id,
                    category: product.category,
                    tags: Array.isArray(product.tags) ? (product.tags as string[]) : [],
                    taxRate: product.taxRate,
                    productAttributes: product.productAttributes,
                });
            });
        }

        const taxBreakdown = calculateInvoiceTaxBreakdown({
            customer: { ...customer, currency },
            company,
            items: processedItems,
            discountAmount: Number(discountAmount || 0),
            defaultTaxRate: Number(taxRate) || 18,
            productMetadata,
        });

        const subtotal = taxBreakdown.subtotal;
        const tax = taxBreakdown.tax;
        const total = taxBreakdown.total;
        const finalProcessedItems = taxBreakdown.lineItems;
        const companyStateCode = taxBreakdown.companyStateCode || company?.stateCode;
        const placeOfSupplyCode = taxBreakdown.placeOfSupplyCode || (customer as any).shippingStateCode || (customer as any).billingStateCode;
        const cgst = taxBreakdown.cgst;
        const sgst = taxBreakdown.sgst;
        const igst = taxBreakdown.igst;
        const cgstRate = taxBreakdown.cgstRate;
        const sgstRate = taxBreakdown.sgstRate;
        const igstRate = taxBreakdown.igstRate;
        const effectiveTaxRate = taxBreakdown.effectiveTaxRate;

        if (taxBreakdown.isDomestic && !taxBreakdown.placeOfSupplyCode) {
            throw new ValidationError(
                'Missing customer state code for GST calculation. Please update billing/shipping state details.',
            );
        }
        if (taxBreakdown.isDomestic && !taxBreakdown.companyStateCode) {
            throw new ValidationError(
                'Missing company state code for GST calculation. Please configure company state code.',
            );
        }

        const newInvoice = await prisma.$transaction(async (tx: any) => {
            // Generate globally-unique invoice & proforma numbers (entity-code-embedded)
            const { invoiceNumber, proformaNumber } = await generateInvoiceNumbers(
                company.id,
                brandId || null,
                undefined,
                tx
            );

            const created = await tx.invoice.create({
                data: {
                invoiceNumber,
                proformaNumber,
                customerProfileId,
                dueDate: new Date(dueDate),
                purchaseOrderNumber: normalizedPurchaseOrderNumber || null,
                invoiceDate: normalizedInvoiceDate ? new Date(normalizedInvoiceDate) : undefined,
                amount: subtotal,
                tax,
                total,
                taxRate: effectiveTaxRate,
                gstNumber: (customer as any).gstVatTaxId,
                
                // Snapshots
                billingAddress: (customer as any).billingAddress,
                billingCity: (customer as any).billingCity,
                billingState: (customer as any).billingState,
                billingStateCode: (customer as any).billingStateCode,
                billingPincode: (customer as any).billingPincode,
                billingCountry: (customer as any).billingCountry || 'India',

                shippingAddress: (customer as any).shippingAddress || (customer as any).billingAddress,
                shippingCity: (customer as any).shippingCity || (customer as any).billingCity,
                shippingState: (customer as any).shippingState || (customer as any).billingState,
                shippingStateCode: (customer as any).shippingStateCode || (customer as any).billingStateCode,
                shippingPincode: (customer as any).shippingPincode || (customer as any).billingPincode,
                shippingCountry: (customer as any).shippingCountry || (customer as any).billingCountry || 'India',

                placeOfSupply: (customer as any).shippingState || (customer as any).billingState,
                placeOfSupplyCode: placeOfSupplyCode,
                companyStateCode: companyStateCode,

                cgst,
                sgst,
                igst,
                cgstRate,
                sgstRate,
                igstRate,

                // Branding Snapshots
                ...brandSnapshot,

                status: 'UNPAID',
                description,
                currency,
                lineItems: finalProcessedItems,
                companyId: company.id,
                brandId: brandId || null,
                // Coupon / Discount
                couponId: couponId || null,
                couponCode: couponCode || null,
                discountType: discountType || null,
                discountValue: discountValue ? Number(discountValue) : 0,
                discountAmount: discountAmount ? Number(discountAmount) : 0,
                }
            });

            // Increment coupon usedCount atomically
            if (couponId) {
                await tx.coupon.update({
                    where: { id: couponId },
                    data: { usedCount: { increment: 1 } }
                }).catch((err: any) => logger.error('Failed to increment coupon usage', err, { couponId }));
            }

            // Reserve stock for physical + inventory-tracked items on invoice creation
            let reservedLineItems = finalProcessedItems;
            try {
                reservedLineItems = await applyInvoiceStockReservations(tx, {
                    invoiceId: created.id,
                    companyId: company.id,
                    lineItems: finalProcessedItems,
                    userId: user.id,
                });
            } catch (reservationError: any) {
                // Convert stock/inventory reservation failures to user-facing validation errors.
                const message = reservationError instanceof Error
                    ? reservationError.message
                    : 'Failed to reserve inventory for invoice items';
                throw new ValidationError(message);
            }

            if (JSON.stringify(reservedLineItems) !== JSON.stringify(finalProcessedItems)) {
                return tx.invoice.update({
                    where: { id: created.id },
                    data: { lineItems: reservedLineItems },
                });
            }

            return created;
        });

        // Finance Automation (non-blocking)
        try {
            await FinanceService.postInvoiceJournal(company.id, newInvoice.id);
        } catch (financeError) {
            logger.error('Failed to post invoice journal', financeError, { invoiceId: newInvoice.id });
        }

        const automationPayload = await loadInvoiceAutomationPayload(newInvoice.id);
        if (automationPayload) {
            await triggerDocumentAutomation({
                entityType: 'invoice',
                eventType: 'create',
                payload: automationPayload,
            });
        }

        logger.info('Invoice created', { invoiceId: newInvoice.id, invoiceNumber: newInvoice.invoiceNumber, createdBy: user.id });

        return NextResponse.json(newInvoice, { status: 201 });

    } catch (error: any) {
        return handleApiError(error, req.nextUrl.pathname);
    }
    }
);
