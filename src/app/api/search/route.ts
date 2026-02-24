import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q') || '';
        const userCompanyId = (decoded as any).companyId;

        if (query.length < 2) {
            return NextResponse.json({ results: [] });
        }

        const where: any = {};
        if (userCompanyId) {
            where.companyId = userCompanyId;
        }

        // Define search across entities
        const [customers, subscriptions, invoices, journals, users] = await Promise.all([
            // 1. Customers
            prisma.customerProfile.findMany({
                where: {
                    ...where,
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { organizationName: { contains: query, mode: 'insensitive' } },
                        { primaryEmail: { contains: query, mode: 'insensitive' } },
                    ],
                },
                take: 5,
                select: { id: true, name: true, organizationName: true, customerType: true }
            }),
            // 2. Subscriptions
            prisma.subscription.findMany({
                where: {
                    ...where,
                    OR: [
                        { id: { contains: query, mode: 'insensitive' } },
                        { customerProfile: { name: { contains: query, mode: 'insensitive' } } },
                    ],
                },
                take: 5,
                include: { customerProfile: { select: { name: true } } }
            }),
            // 3. Invoices
            prisma.invoice.findMany({
                where: {
                    ...where,
                    OR: [
                        { invoiceNumber: { contains: query, mode: 'insensitive' } },
                        { subscription: { customerProfile: { name: { contains: query, mode: 'insensitive' } } } },
                    ],
                },
                take: 5,
                include: { subscription: { include: { customerProfile: { select: { name: true } } } } }
            }),
            // 4. Journals (Global)
            prisma.journal.findMany({
                where: {
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { issnPrint: { contains: query, mode: 'insensitive' } },
                        { issnOnline: { contains: query, mode: 'insensitive' } },
                    ],
                },
                take: 5,
            }),
            // 5. Users (Staff)
            prisma.user.findMany({
                where: {
                    ...(userCompanyId ? { companies: { some: { id: userCompanyId } } } : {}),
                    email: { contains: query, mode: 'insensitive' },
                    role: { not: 'CUSTOMER' }
                },
                take: 5,
                select: { id: true, email: true, role: true }
            })
        ]);

        // Format results for the frontend
        const results = [
            ...customers.map((c: any) => ({
                id: c.id,
                title: c.name,
                subtitle: c.organizationName || c.customerType,
                type: 'Customer',
                href: `/dashboard/customers/${c.id}`,
                icon: '👤'
            })),
            ...subscriptions.map((s: any) => ({
                id: s.id,
                title: `Subscription: ${s.id.slice(0, 8)}`,
                subtitle: `Customer: ${s.customerProfile.name}`,
                type: 'Subscription',
                href: `/dashboard/crm/subscriptions/${s.id}`,
                icon: '📋'
            })),
            ...invoices.map((i: any) => ({
                id: i.id,
                title: `Invoice: ${i.invoiceNumber}`,
                subtitle: `Customer: ${i.subscription.customerProfile.name}`,
                type: 'Invoice',
                href: `/dashboard/crm/invoices/${i.id}`,
                icon: '🧾'
            })),
            ...journals.map((j: any) => ({
                id: j.id,
                title: j.name,
                subtitle: `ISSN: ${j.issnPrint || j.issnOnline || 'N/A'}`,
                type: 'Journal',
                href: `/dashboard/journals/${j.id}`,
                icon: '📰'
            })),
            ...users.map((u: any) => ({
                id: u.id,
                title: u.email,
                subtitle: u.role.replace('_', ' '),
                type: 'Staff',
                href: `/dashboard/users/${u.id}`,
                icon: '👥'
            }))
        ];

        return NextResponse.json({ results });

    } catch (error: any) {
        console.error('Global Search Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
