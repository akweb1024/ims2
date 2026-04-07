import { Suspense } from 'react';
import StaffManagementContent from '@/components/dashboard/staff-management/StaffManagementContent';

export default function StaffManagementPage() {
    return (
        <div className="min-h-screen bg-secondary-50/50">
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
