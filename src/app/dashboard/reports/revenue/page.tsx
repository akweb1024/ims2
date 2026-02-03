import { Suspense } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { Download } from 'lucide-react';
import RevenueReportTable from './RevenueReportTable';

export const dynamic = 'force-dynamic';

async function getRevenueData() {
    const user = await getAuthenticatedUser();
    if (!user) return { monthly: [], yearly: [] };

    // Fetch all confirmed financial records
    const records = await prisma.financialRecord.findMany({
        where: {
            status: 'COMPLETED',
            companyId: user.companyId || undefined
        },
        select: {
            amount: true,
            date: true,
            category: true,
            type: true // FinancialType: REVENUE | EXPENSE
        }
    });

    // Aggregate by Month-Year-Category-Type
    const monthlyAgg: Record<string, any> = {};
    const yearlyAgg: Record<string, any> = {};

    records.forEach(rec => {
        const date = new Date(rec.date);
        const monthYear = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
        const year = date.getFullYear().toString();
        const key = `${monthYear}-${rec.category}-${rec.type}`;
        const yearKey = `${year}-${rec.category}-${rec.type}`;

        // Monthly Aggregation
        if (!monthlyAgg[key]) {
            monthlyAgg[key] = {
                period: monthYear,
                monthVal: date.getMonth(),
                yearVal: date.getFullYear(),
                category: rec.category,
                type: rec.type,
                amount: 0
            };
        }
        monthlyAgg[key].amount += rec.amount;

        // Yearly Aggregation
        if (!yearlyAgg[yearKey]) {
            yearlyAgg[yearKey] = {
                period: year,
                category: rec.category,
                type: rec.type,
                amount: 0
            };
        }
        yearlyAgg[yearKey].amount += rec.amount;
    });

    // Convert to arrays and sort
    const monthlyData = Object.values(monthlyAgg).sort((a, b) => {
        if (a.yearVal !== b.yearVal) return b.yearVal - a.yearVal;
        return b.monthVal - a.monthVal;
    });

    const yearlyData = Object.values(yearlyAgg).sort((a, b) => Number(b.period) - Number(a.period));

    return { monthly: monthlyData, yearly: yearlyData };
}

export default async function RevenueReportPage() {
    const { monthly, yearly } = await getRevenueData();

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-black text-secondary-900">Financial Report</h1>
                        <p className="text-sm text-secondary-600 mt-1">Consolidated revenue and expense breakdown</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Monthly View */}
                    <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-secondary-100 bg-secondary-50">
                            <h3 className="font-bold text-secondary-900">Monthly Breakdown</h3>
                        </div>
                        <RevenueReportTable data={monthly} />
                    </div>

                    {/* Yearly View */}
                    <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-secondary-100 bg-secondary-50">
                            <h3 className="font-bold text-secondary-900">Yearly Overview</h3>
                        </div>
                        <RevenueReportTable data={yearly} isYearly />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
