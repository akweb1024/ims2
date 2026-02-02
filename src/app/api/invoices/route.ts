import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { InvoiceStatus } from '@/types';
import { FinanceService } from '@/lib/services/finance';
import { logger } from '@/lib/logger';

// ... imports

export async function GET(req: NextRequest) {
    try {
        // 1. Verify Authentication
        const decoded = await getAuthenticatedUser();
        if (!decoded || !decoded.role) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // 2. Parse Query Parameters
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const status = searchParams.get('status') as InvoiceStatus | null;
        const search = searchParams.get('search') || '';

        const skip = (page - 1) * limit;

        // 3. Build Filter
        const where: any = {};
        const userCompanyId = (decoded as any).companyId;

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
        if (decoded.role === 'CUSTOMER') {
            const profile = await prisma.customerProfile.findUnique({ where: { userId: decoded.id } });
            if (profile) {
                where.OR = [
                    { customerProfileId: profile.id }, // Direct one-off
                    { subscription: { customerProfileId: profile.id } } // Via subscription
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
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error: any) {
        logger.error('Invoices API Error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'FINANCE_ADMIN', 'MANAGER'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await req.json();
        const { customerProfileId, dueDate, lineItems, description, taxRate = 0 } = body;

        if (!customerProfileId || !lineItems || lineItems.length === 0) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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

        const tax = subtotal * (Number(taxRate) / 100);
        const total = subtotal + tax;

        // Generate Invoice Number
        const year = new Date().getFullYear();
        const count = await prisma.invoice.count();
        const invoiceNumber = `INV-${year}-${(count + 1).toString().padStart(5, '0')}`;

        const newInvoice = await prisma.invoice.create({
            data: {
                invoiceNumber,
                customerProfileId,
                dueDate: new Date(dueDate),
                amount: subtotal,
                tax,
                total,
                status: 'UNPAID',
                description,
                lineItems: processedItems, // Saved as JSON
                companyId: (decoded as any).companyId
            }
        });

        // --- Finance Automation ---
        try {
            if ((decoded as any).companyId) {
                await FinanceService.postInvoiceJournal((decoded as any).companyId, newInvoice.id);
            }
        } catch (financeError) {
            logger.error('Failed to post invoice journal', financeError, { invoiceId: newInvoice.id });
            // Non-blocking error
        }
        // --------------------------

        return NextResponse.json(newInvoice);

    } catch (error: any) {
        logger.error('Create Invoice Error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

