import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth-legacy';
import { logger } from '@/lib/logger';
import { generateFallbackInvoiceNumber } from '@/lib/invoice-number';
import { calculateInvoiceTaxBreakdown } from '@/lib/invoice-tax';

export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.split(' ')[1];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decoded = verifyToken(token);
        if (!decoded || !['SUPER_ADMIN', 'EXECUTIVE', 'MANAGER'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const {
            customerProfileId,
            startDate,
            endDate,
            salesChannel,
            agencyId,
            items, // list of { planId, courseId, workshopId, productId, quantity }
            autoRenew,
            currency = 'INR',
            taxRate = 0
        } = body;

        // 2. Fetch Customer and Company for Snapshots
        const customer = await prisma.customerProfile.findUnique({
            where: { id: customerProfileId },
            include: { company: true }
        });

        if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

        const company = customer.company;
        const targetCompanyId = (decoded as any).companyId || customer.companyId;

        // 3. Validation and Item Processing
        if (!items || items.length === 0) {
            return NextResponse.json({ error: 'Missing required items' }, { status: 400 });
        }

        // Validate Agency if Sales Channel is AGENCY
        let appliedDiscountRate = 0;
        if (salesChannel === 'AGENCY') {
            if (!agencyId) {
                return NextResponse.json({ error: 'Agency is required for Agency Sales Channel' }, { status: 400 });
            }
            const agency = await prisma.customerProfile.findUnique({
                where: { id: agencyId },
                include: { agencyDetails: true }
            });

            if (!agency || agency.organizationType !== 'AGENCY') {
                return NextResponse.json({ error: 'Invalid Agency' }, { status: 400 });
            }

            appliedDiscountRate = agency.agencyDetails?.discountRate || 0;
        }

        // 4. Calculate Totals and Process Items
        let subtotal = 0;
        let totalInINR = 0;
        let totalInUSD = 0;
        const subscriptionItems: any[] = [];
        const invoiceLineItems: any[] = [];

        for (const item of items) {
            let price = 0;
            let pINR = 0;
            let pUSD = 0;
            let description = '';

            if (item.planId) {
                const plan = await prisma.plan.findUnique({
                    where: { id: item.planId },
                    include: { journal: true }
                });
                if (!plan) return NextResponse.json({ error: `Plan ${item.planId} not found` }, { status: 404 });
                pINR = plan.priceINR;
                pUSD = plan.priceUSD;
                description = `Journal: ${plan.journal.name} (${plan.planType})`;
            } else if (item.courseId) {
                const course = await prisma.course.findUnique({ where: { id: item.courseId } });
                if (!course) return NextResponse.json({ error: `Course ${item.courseId} not found` }, { status: 404 });
                pINR = course.price || 0;
                pUSD = 0;
                description = `Course: ${course.title}`;
            } else if (item.workshopId) {
                const workshop = await prisma.workshop.findUnique({ where: { id: item.workshopId } });
                if (!workshop) return NextResponse.json({ error: `Workshop ${item.workshopId} not found` }, { status: 404 });
                pINR = workshop.price || 0;
                pUSD = 0;
                description = `Workshop: ${workshop.title}`;
            } else if (item.productId) {
                const product = await (prisma as any).product.findUnique({ where: { id: item.productId } });
                if (!product) return NextResponse.json({ error: `Product ${item.productId} not found` }, { status: 404 });
                pINR = product.priceINR;
                pUSD = product.priceUSD;
                description = `${product.type}: ${product.name}`;
            }

            price = currency === 'USD' ? pUSD : pINR;
            const qty = item.quantity || 1;
            
            subtotal += price * qty;
            totalInINR += pINR * qty;
            totalInUSD += pUSD * qty;

            subscriptionItems.push({
                journalId: item.journalId || null,
                planId: item.planId || null,
                courseId: item.courseId || null,
                workshopId: item.workshopId || null,
                productId: item.productId || null,
                quantity: qty,
                price: price
            });

            invoiceLineItems.push({
                description,
                quantity: qty,
                unitPrice: price,
                total: price * qty
            });
        }

        // Apply Discount and Tax via standard builder
        const taxBreakdown = calculateInvoiceTaxBreakdown({
            customer: { ...customer, currency },
            company: { stateCode: company?.stateCode || '' },
            items: invoiceLineItems.map(item => ({
                ...item,
                amount: item.total
            })),
            discountAmount: subtotal * (appliedDiscountRate / 100),
            defaultTaxRate: Number(taxRate) || 18,
        });

        const discountAmount = taxBreakdown.subtotal - taxBreakdown.taxableSubtotal;
        const taxableAmount = taxBreakdown.taxableSubtotal;
        const taxAmount = taxBreakdown.tax;
        const finalTotal = taxBreakdown.total;

        const cgst = taxBreakdown.cgst;
        const sgst = taxBreakdown.sgst;
        const igst = taxBreakdown.igst;
        const cgstRate = taxBreakdown.cgstRate;
        const sgstRate = taxBreakdown.sgstRate;
        const igstRate = taxBreakdown.igstRate;
        const placeOfSupplyCode = taxBreakdown.placeOfSupplyCode || (customer as any).shippingStateCode || (customer as any).billingStateCode;
        const companyStateCode = taxBreakdown.companyStateCode || company?.stateCode;

        // Branding Snapshot
        const brandSnapshot = {
            brandRelationType: (company as any)?.brandRelationType || 'A Brand of',
            companyLogoUrl: (company as any)?.invoiceCompanyLogoUrl || company?.logoUrl || null,
            brandLogoUrl: company?.logoUrl || null,
            brandAddress: company?.address || null,
            brandEmail: company?.email || null,
            brandWebsite: company?.website || null
        };

        // 5. Create Subscription and Invoice in a transaction
        const result = await prisma.$transaction(async (tx: any) => {
            // Create Subscription
            const subscription = await tx.subscription.create({
                data: {
                    customerProfileId,
                    companyId: targetCompanyId,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    salesChannel,
                    agencyId: salesChannel === 'AGENCY' ? agencyId : null,
                    autoRenew: autoRenew || false,
                    status: 'PENDING_PAYMENT',
                    currency,
                    subtotal,
                    discount: discountAmount,
                    tax: taxAmount,
                    total: finalTotal,
                    subtotalInINR: totalInINR, 
                    subtotalInUSD: totalInUSD,
                    totalInINR: (totalInINR * (1 - appliedDiscountRate / 100)) * (1 + Number(taxRate) / 100),
                    totalInUSD: (totalInUSD * (1 - appliedDiscountRate / 100)) * (1 + Number(taxRate) / 100),
                    salesExecutiveId: decoded.id,
                    items: {
                        create: subscriptionItems
                    }
                }
            });

            // Create Invoice
            const invoiceNumber = generateFallbackInvoiceNumber(
                company?.name || targetCompanyId || 'GEN',
                'INV-'
            );
            const invoice = await tx.invoice.create({
                data: {
                    subscriptionId: subscription.id,
                    customerProfileId,
                    companyId: targetCompanyId,
                    invoiceNumber,
                    currency,
                    amount: taxableAmount,
                    tax: taxAmount,
                    total: finalTotal,
                    taxRate: Number(taxRate),
                    status: 'UNPAID',
                    dueDate: new Date(new Date().getTime() + 15 * 24 * 60 * 60 * 1000),
                    lineItems: invoiceLineItems,
                    
                    // Tax Details
                    cgst, sgst, igst,
                    cgstRate, sgstRate, igstRate,
                    placeOfSupplyCode,
                    companyStateCode,
                    
                    // Address Snapshots
                    billingAddress: customer.billingAddress,
                    billingCity: customer.billingCity,
                    billingState: customer.billingState,
                    billingStateCode: customer.billingStateCode,
                    billingPincode: customer.billingPincode,
                    billingCountry: customer.billingCountry,

                    // Branding Snapshots
                    ...brandSnapshot
                }
            });

            // Log Audit
            await tx.auditLog.create({
                data: {
                    userId: decoded.id,
                    action: 'create',
                    entity: 'subscription',
                    entityId: subscription.id,
                    changes: JSON.stringify({ total: finalTotal, discount: discountAmount, agencyId, itemsCount: items.length })
                }
            });

            return { subscription, invoice };
        });

        return NextResponse.json({
            success: true,
            subscriptionId: result.subscription.id,
            invoiceNumber: result.invoice.invoiceNumber
        });

    } catch (error: any) {
        logger.error('Create Subscription Error', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            message: error.message
        }, { status: 500 });
    }
}
