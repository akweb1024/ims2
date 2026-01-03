import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'MANAGER', 'FINANCE_ADMIN'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const invoices = await prisma.invoice.findMany({
            include: {
                subscription: {
                    include: {
                        customerProfile: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Generate CSV
        const headers = ['Subscription ID', 'Invoice Number', 'Customer', 'Email', 'Status', 'Amount', 'Currency', 'Due Date', 'Paid Date', 'Created At'];
        const rows = invoices.map(inv => [
            inv.subscription.id,
            inv.invoiceNumber,
            inv.subscription.customerProfile.name,
            inv.subscription.customerProfile.primaryEmail,
            inv.status,
            inv.total,
            inv.currency,
            inv.dueDate.toISOString().split('T')[0],
            inv.paidDate ? inv.paidDate.toISOString().split('T')[0] : 'N/A',
            inv.createdAt.toISOString().split('T')[0]
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="invoices-export-${Date.now()}.csv"`
            }
        });

    } catch (error: any) {
        console.error('Export Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
