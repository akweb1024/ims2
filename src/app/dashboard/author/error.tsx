'use client';

import { useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Author Dashboard Error:', error);
    }, [error]);

    return (
        <DashboardLayout>
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 p-6">
                <div className="text-6xl">📝</div>
                <h2 className="text-2xl font-bold text-secondary-900">Unable to Load Dashboard</h2>
                <p className="text-secondary-500 max-w-md text-center">
                    We couldn&apos;t load your manuscripts. This might be a temporary issue with our servers.
                </p>
                <div className="flex gap-4 pt-4">
                    <button
                        onClick={() => reset()}
                        className="btn btn-primary px-6"
                    >
                        Try again
                    </button>
                    <Link href="/dashboard/author/submit" className="btn btn-secondary px-6">
                        Submit New Manuscript
                    </Link>
                </div>
                {error.digest && (
                    <p className="text-xs text-secondary-300 font-mono mt-8">Error ID: {error.digest}</p>
                )}
            </div>
        </DashboardLayout>
    );
}
