import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { handleApiError, ValidationError, NotFoundError } from '@/lib/error-handler';
import { InvoiceStatus } from '@/types';
import { FinanceService } from '@/lib/services/finance';
import { logger } from '@/lib/logger';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
    try {
        // Parse Query Parameters
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const status = searchParams.get('status') as InvoiceStatus | null;
        const search = searchParams.get('search') || '';

        const skip = (page - 1) * limit;

        // 3. Build Filter
        const where: any = {};
        const userCompanyId = user.companyId;

        if (userCompanyId) {
            where.companyId = userCompanyId;
        }

        if (status) {
            where.status = status;
        }

        if (search) {
            where.OR = [
                { invoiceNumber: { contains: search } },
                { subscription: { customerProfile: { name: { contains: search } } } },
                { subscription: { customerProfile: { organizationName: { contains: search } } } },
                { customerProfile: { name: { contains: search } } },
                { customerProfile: { organizationName: { contains: search } } }
            ];
        }

        // Role-based filtering: Customers only see their own invoices
        if (user.role === 'CUSTOMER') {
            const profile = await prisma.customerProfile.findUnique({ where: { userId: user.id } });
            if (profile) {
                where.OR = [
                    { customerProfileId: profile.id },
                    { subscription: { customerProfileId: profile.id } }
                ];
            } else {
                return NextResponse.json({ data: [], pagination: { page, limit, total: 0, totalPages: 0 } });
            }
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
                    }
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
    ['SUPER_ADMIN', 'FINANCE_ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
    try {
        const body = await req.json();
        const { customerProfileId, brandId, couponId, couponCode, discountType, discountValue, discountAmount,
                dueDate, lineItems, description, taxRate = 0, currency = 'INR' } = body;

        if (!customerProfileId || !lineItems || lineItems.length === 0) {
            throw new ValidationError('customerProfileId and at least one lineItem are required');
        }

        // Calculate Totals
        let subtotal = 0;
        const processedItems = lineItems.map((item: any) => {
            const amount = Number(item.quantity) * Number(item.price);
            subtotal += amount;
            return {
                ...item,
                amount
            };
        });

        // Initial placeholder totals, will be refined after customer/location check
        let tax = 0;
        let total = subtotal - Number(discountAmount || 0);

        const customer = await prisma.customerProfile.findUnique({
            where: { id: customerProfileId }
        });

        if (!customer) throw new NotFoundError('Customer');

        // Fetch Company for Snapshots and Number Generation
        const company = await prisma.company.findUnique({
            where: { id: (user.companyId ?? customer.companyId) as string }
        });
        
        if (!company) throw new NotFoundError('Company');

        let invoiceNumber = '';
        let proformaNumber = '';
        const year = new Date().getFullYear();

        // Robust Invoice & Proforma Number Generation with Retry Logic
        let attempts = 0;
        const maxAttempts = 5;
        let createdInvoice = null;

        while (attempts < maxAttempts) {
            try {
                if (brandId) {
                    const updatedBrand = await prisma.brand.update({
                        where: { id: brandId },
                        data: {
                            invoiceNextNumber: { increment: 1 },
                            proformaNextNumber: { increment: 1 },
                        }
                    });
                    const invPrefix = updatedBrand.invoicePrefix || company.invoicePrefix || 'INV-';
                    const proPrefix = updatedBrand.proformaPrefix || company.proformaPrefix || 'PRO-';
                    invoiceNumber = `${invPrefix}${year}-${(updatedBrand.invoiceNextNumber! - 1).toString().padStart(5, '0')}`;
                    proformaNumber = `${proPrefix}${year}-${(updatedBrand.proformaNextNumber! - 1).toString().padStart(5, '0')}`;
                } else {
                    const updatedCompany = await prisma.company.update({
                        where: { id: company.id },
                        data: {
                            invoiceNextNumber: { increment: 1 },
                            proformaNextNumber: { increment: 1 },
                        }
                    });
                    const invPrefix = updatedCompany.invoicePrefix || 'INV-';
                    const proPrefix = updatedCompany.proformaPrefix || 'PRO-';
                    invoiceNumber = `${invPrefix}${year}-${(updatedCompany.invoiceNextNumber - 1).toString().padStart(5, '0')}`;
                    proformaNumber = `${proPrefix}${year}-${(updatedCompany.proformaNextNumber - 1).toString().padStart(5, '0')}`;
                }

                // Check for existing invoice with this number (just in case of manual entry)
                const existing = await prisma.invoice.findFirst({
                    where: {
                        OR: [
                            { invoiceNumber },
                            { proformaNumber }
                        ]
                    }
                });

                if (existing) {
                    attempts++;
                    continue;
                }
                break; // Unique numbers found
            } catch (err) {
                attempts++;
                if (attempts >= maxAttempts) throw err;
            }
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
            const brand = await prisma.brand.findUnique({
                where: { id: brandId }
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

        const customerCountry = (customer as any).billingCountry || 'India';
        const isInternational = customerCountry.toLowerCase() !== 'india';
        
        // Final Tax Calculation based on location
        const effectiveTaxRate = isInternational ? 0 : Number(taxRate);
        tax = (subtotal - Number(discountAmount || 0)) * (effectiveTaxRate / 100);
        total = subtotal - Number(discountAmount || 0) + tax;

        const companyStateCode = company?.stateCode;
        const placeOfSupplyCode = (customer as any).shippingStateCode || (customer as any).billingStateCode;
        
        // Calculate CGST, SGST, IGST
        let cgst = 0, sgst = 0, igst = 0;
        let cgstRate = 0, sgstRate = 0, igstRate = 0;
        
        if (effectiveTaxRate > 0) {
            if (companyStateCode && placeOfSupplyCode && companyStateCode === placeOfSupplyCode) {
                // Intra-state (Same state)
                cgstRate = effectiveTaxRate / 2;
                sgstRate = effectiveTaxRate / 2;
                cgst = tax / 2;
                sgst = tax / 2;
            } else {
                // Inter-state (Different state)
                igstRate = effectiveTaxRate;
                igst = tax;
            }
        }

        const newInvoice = await (prisma.invoice as any).create({
            data: {
                invoiceNumber,
                proformaNumber,
                customerProfileId,
                dueDate: new Date(dueDate),
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
                lineItems: processedItems,
                companyId: user.companyId,
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
            await prisma.coupon.update({
                where: { id: couponId },
                data: { usedCount: { increment: 1 } }
            }).catch((err: any) => logger.error('Failed to increment coupon usage', err, { couponId }));
        }

        // Deduct Stock
        for (const item of processedItems) {
            const qty = Number(item.quantity) || 1;
            if (item.variantId) {
                await prisma.productVariant.update({
                    where: { id: item.variantId },
                    data: { stockQuantity: { decrement: qty } }
                }).catch(() => {});
            }
        }

        // Finance Automation (non-blocking)
        try {
            if (user.companyId) {
                await FinanceService.postInvoiceJournal(user.companyId, newInvoice.id);
            }
        } catch (financeError) {
            logger.error('Failed to post invoice journal', financeError, { invoiceId: newInvoice.id });
        }

        logger.info('Invoice created', { invoiceId: newInvoice.id, invoiceNumber: newInvoice.invoiceNumber, createdBy: user.id });

        return NextResponse.json(newInvoice, { status: 201 });

    } catch (error: any) {
        return handleApiError(error, req.nextUrl.pathname);
    }
    }
);
