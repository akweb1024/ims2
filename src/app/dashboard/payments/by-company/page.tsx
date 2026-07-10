'use client';

import CompanyTransactionsPanel from '@/components/dashboard/CompanyTransactionsPanel';

/**
 * One place to see Razorpay transactions across every company the current user has access
 * to — a company tab per entry. The whole view lives in CompanyTransactionsPanel (shared
 * with the main dashboard), which reuses the already company-scoped /api/payments/razorpay.
 */
export default function PaymentsByCompanyPage() {
    return (
        <div className="animate-fade-in">
            <CompanyTransactionsPanel
                heading="Company Transactions"
                subheading="Razorpay payments, one company at a time."
            />
        </div>
    );
}
