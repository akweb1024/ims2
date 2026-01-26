'use client';

import { useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('LMS Dashboard Error:', error);
    }, [error]);

    return (
        <DashboardLayout>
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="text-6xl">🎓</div>
                <h2 className="text-2xl font-bold text-secondary-900">LMS Dashboard Error</h2>
                <p className="text-secondary-500 max-w-md text-center">
                    We couldn&apos;t load the LMS analytics data. This might be a temporary issue with our servers.
                </p>
                <div className="flex gap-4 pt-4">
                    <button
                        onClick={() => reset()}
                        className="btn btn-primary px-6"
                    >
                        Try again
                    </button>
                    <button
                        onClick={() => window.location.href = '/dashboard'}
                        className="btn btn-secondary px-6"
                    >
                        Go to Home
                    </button>
                </div>
                {error.digest && (
                    <p className="text-xs text-secondary-300 font-mono mt-8">Error ID: {error.digest}</p>
                )}
            </div>
        </DashboardLayout>
    );
}
