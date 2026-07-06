import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import StaffManagementContent from '@/components/dashboard/staff-management/StaffManagementContent';

export default function StaffManagementPage() {
    return (
        <div className="min-h-screen bg-secondary-50/50">
            {/* Retirement phase 1: HR Command Center now covers everything this
                module does (incl. Punch In/Out). This banner steers users over
                before the module is removed in a later phase. */}
            <div className="mx-4 mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-amber-800">
                    Staff Management is moving into the <span className="font-black">HR Command Center</span> — you can already find every tab there, including Punch In/Out.
                </p>
                <Link
                    href="/dashboard/hr-management"
                    className="inline-flex items-center gap-1.5 text-sm font-black text-amber-900 hover:text-amber-700 whitespace-nowrap"
                >
                    Open HR Command Center <ArrowRight size={14} />
                </Link>
            </div>
            <Suspense fallback={
                <div className="flex items-center justify-center min-h-screen">
                    <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                        <p className="text-secondary-500 font-medium animate-pulse">Loading Staff Management...</p>
                    </div>
                </div>
            }>
                <StaffManagementContent />
            </Suspense>
        </div>
    );
}
