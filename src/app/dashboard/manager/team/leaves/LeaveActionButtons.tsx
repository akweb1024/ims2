'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function LeaveActionButtons({
    leaveId,
    status
}: {
    leaveId: string;
    status: string
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // If already approved/rejected, don't show buttons
    if (status !== 'PENDING') return null;

    const handleAction = async (newStatus: 'APPROVED' | 'REJECTED') => {
        try {
            setLoading(true);
            const res = await fetch('/api/manager/team/leaves', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: leaveId, status: newStatus })
            });

            if (!res.ok) {
                throw new Error('Failed to update leave request');
            }

            toast.success(`Leave request ${newStatus.toLowerCase()} successfully`);
            router.refresh();
        } catch (error) {
            toast.error('Something went wrong');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center gap-2 justify-end">
            <button
                onClick={() => handleAction('APPROVED')}
                disabled={loading}
                className="px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded hover:bg-green-100 disabled:opacity-50"
            >
                Approve
            </button>
            <button
                onClick={() => handleAction('REJECTED')}
                disabled={loading}
                className="px-3 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded hover:bg-red-100 disabled:opacity-50"
            >
                Reject
            </button>
        </div>
    );
}
