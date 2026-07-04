'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import Link from 'next/link';

function isStaleBuildAssetError(message: string) {
    return (
        message.includes('ChunkLoadError') ||
        message.includes('Loading chunk') ||
        message.includes('Failed to fetch dynamically imported module') ||
        message.includes('/_next/static/') ||
        message.includes('Failed to find Server Action')
    );
}

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log error to console in development
        console.error('Application Error:', error);

        // Stale-deploy chunk errors are expected churn, not bugs.
        if (!isStaleBuildAssetError(error.message || '')) {
            Sentry.captureException(error);
        }
    }, [error]);

    const isStaleBuildError = isStaleBuildAssetError(error.message || '');
    const primaryAction = () => {
        if (isStaleBuildError) {
            window.location.reload();
            return;
        }
        reset();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                {/* Glassmorphism Card */}
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 md:p-12">
                    {/* Logo/Brand */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 text-white text-3xl font-bold mb-4">
                            STM
                        </div>
                        <h1 className="text-6xl font-bold text-gray-800 mb-2">Oops!</h1>
                        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
                            {isStaleBuildError ? 'A New Version Is Ready' : 'Something Went Wrong'}
                        </h2>
                        <p className="text-gray-600 text-lg">
                            {isStaleBuildError
                                ? 'Your browser is holding an older app bundle. Refresh once to continue with the latest deployment.'
                                : 'We encountered an unexpected error. Don&apos;t worry, our team has been notified.'}
                        </p>
                    </div>

                    {/* Illustration */}
                    <div className="flex justify-center mb-8">
                        <div className="text-8xl">⚠️</div>
                    </div>

                    {/* Error Details (Development Only) */}
                    {process.env.NODE_ENV === 'development' && (
                        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl">
                            <p className="text-sm font-mono text-red-800 break-all">
                                <strong>Error:</strong> {error.message}
                            </p>
                            {error.digest && (
                                <p className="text-xs font-mono text-red-600 mt-2">
                                    <strong>Digest:</strong> {error.digest}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-4">
                        <button
                            onClick={primaryAction}
                            className="block w-full bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 text-center shadow-lg"
                        >
                            {isStaleBuildError ? 'Refresh Now' : 'Try Again'}
                        </button>

                        <Link
                            href="/dashboard"
                            className="block w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-4 px-6 rounded-xl transition-all duration-200 border-2 border-gray-200 hover:border-gray-300 text-center"
                        >
                            Go to Dashboard
                        </Link>

                        <Link
                            href="/"
                            className="block w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-4 px-6 rounded-xl transition-all duration-200 border-2 border-gray-200 hover:border-gray-300 text-center"
                        >
                            Back to Home
                        </Link>
                    </div>

                    {/* Help Section */}
                    <div className="mt-8 pt-8 border-t border-gray-200">
                        <h3 className="text-center font-semibold text-gray-700 mb-4">
                            Need Immediate Help?
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <a
                                href="mailto:support@stmcustomer.com"
                                className="flex items-center justify-center gap-2 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                            >
                                <span>📧</span>
                                <span className="text-blue-700 font-medium">Email Support</span>
                            </a>
                            <Link
                                href="/dashboard/tickets"
                                className="flex items-center justify-center gap-2 p-3 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                            >
                                <span>🎫</span>
                                <span className="text-indigo-700 font-medium">Create Ticket</span>
                            </Link>
                        </div>
                    </div>

                    {/* Additional Info */}
                    <div className="mt-6 text-center text-xs text-gray-400">
                        {error.digest && (
                            <p>Error ID: {error.digest}</p>
                        )}
                        <p className="mt-1">
                            If this problem persists, please contact support with the error ID above.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Style guide accessibility compliance helper comment: aria-label placeholder label
