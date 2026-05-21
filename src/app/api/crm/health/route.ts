import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

export async function GET(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const companyId = user.companyId || (await prisma.company.findFirst())?.id;
        if (!companyId) {
            return NextResponse.json({ error: 'No active company context' }, { status: 400 });
        }

        const customers = await prisma.customerProfile.findMany({
            where: { companyId },
            include: {
                subscriptions: {
                    where: { status: 'ACTIVE' }
                }
            }
        });

        // Fetch all unpaid invoices for these customers
        const unpaidInvoices = await prisma.invoice.findMany({
            where: {
                companyId,
                status: 'UNPAID'
            }
        });

        const invoiceMap = unpaidInvoices.reduce((acc: any, inv) => {
            if (inv.customerProfileId) {
                acc[inv.customerProfileId] = (acc[inv.customerProfileId] || 0) + 1;
            }
            return acc;
        }, {});

        const analyzedCustomers = customers.map(cust => {
            const activeSubCount = cust.subscriptions.length;
            const unpaidCount = invoiceMap[cust.id] || 0;
            const leadScore = cust.leadScore || 0;

            // Health calculation logic
            let score = 75; // Baseline
            const reasons: string[] = [];

            if (activeSubCount > 0) {
                score += 15;
                reasons.push('Has active subscription contracts');
            } else {
                score -= 15;
                reasons.push('No active subscription plans');
            }

            if (unpaidCount > 0) {
                const deduction = Math.min(40, unpaidCount * 15);
                score -= deduction;
                reasons.push(`${unpaidCount} unpaid invoices currently pending`);
            } else if (activeSubCount > 0) {
                score += 10;
                reasons.push('All invoices settled on time');
            }

            if (leadScore > 80) {
                score += 5;
            } else if (leadScore < 30) {
                score -= 5;
            }

            // Cap between 0 and 100
            const finalScore = Math.min(100, Math.max(0, score));
            const isHighChurnRisk = finalScore < 60;

            return {
                id: cust.id,
                name: cust.name,
                organizationName: cust.organizationName || 'Individual Client',
                email: cust.primaryEmail,
                phone: cust.primaryPhone,
                healthScore: finalScore,
                churnRisk: isHighChurnRisk,
                activeSubscriptions: activeSubCount,
                unpaidInvoices: unpaidCount,
                reasons
            };
        });

        // Sort by health score ascending so lowest health (highest risk) comes first
        analyzedCustomers.sort((a, b) => a.healthScore - b.healthScore);

        return NextResponse.json({ customers: analyzedCustomers });

    } catch (error: any) {
        console.error('CRM Health Fetch Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
