import { redirect } from 'next/navigation';

// Staff Management retirement phase 2: the HR Command Center is a superset of
// this module, so every tab now redirects to its command-center equivalent.
// (Old bookmarks and deep links keep working.)
const TAB_MAP: Record<string, string> = {
    employees: 'employees',
    attendance: 'attendance',
    punch: 'punch',
    leave: 'leaves',
    'balance-leave': 'leave-ledger',
    salary: 'payroll',
    'work-reports': 'reports',
    analytics: 'productivity',
};

export default async function StaffManagementRedirect({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string }>;
}) {
    const { tab } = await searchParams;
    const mapped = tab ? TAB_MAP[tab] : undefined;
    redirect(mapped ? `/dashboard/hr-management?tab=${mapped}` : '/dashboard/hr-management');
}
