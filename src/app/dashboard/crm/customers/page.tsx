import { redirect } from 'next/navigation';

// Merged into /dashboard/customers (the route-family root and deep-link
// target). This stub only protects old bookmarks.
export default function CRMCustomersPage() {
    redirect('/dashboard/customers');
}
