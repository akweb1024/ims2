import { redirect } from 'next/navigation';

// The billing hub fetched nothing and half its links 404'd (the proforma UI
// does not exist). /dashboard/crm/invoices is the survivor; this stub only
// protects old bookmarks.
export default function CRMBillingPage() {
    redirect('/dashboard/crm/invoices');
}
