'use client';

import { useEffect } from 'react';
import { toast } from 'react-hot-toast';

const STALE_BUILD_TOAST_ID = 'stale-client-build-refresh';

function showStaleBuildToast() {
    toast.custom(
        (t) => (
            <div
                className={`pointer-events-auto w-[360px] rounded-xl border border-amber-400/50 bg-amber-50 p-4 text-amber-950 shadow-lg transition-all ${
                    t.visible ? 'animate-enter' : 'animate-leave'
                }`}
            >
                <p className="text-sm font-semibold">A new version is available.</p>
                <p className="mt-1 text-xs text-amber-900">
                    Refresh to continue safely with the latest deployment.
                </p>
                <button
                    type="button"
                    className="mt-3 inline-flex rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                    onClick={() => {
                        toast.dismiss(STALE_BUILD_TOAST_ID);
                        window.location.reload();
                    }}
                >
                    Refresh now
                </button>
            </div>
        ),
        {
            id: STALE_BUILD_TOAST_ID,
            duration: Infinity,
            position: 'top-right',
        }
    );
}

export default function StaleClientBuildGuard() {
    useEffect(() => {
        const originalFetch = window.fetch.bind(window);
        const staleActionMessage = 'Failed to find Server Action';

        const maybeShowFromMessage = (value: unknown) => {
            if (typeof value !== 'string') return;
            if (value.includes(staleActionMessage)) {
                showStaleBuildToast();
            }
        };

        window.fetch = async (...args: Parameters<typeof fetch>) => {
            const response = await originalFetch(...args);

            if (response.status !== 409) {
                return response;
            }

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                return response;
            }

            try {
                const payload = await response.clone().json();
                if (payload?.error === 'StaleClientBuild') {
                    showStaleBuildToast();
                }
            } catch {
                // Ignore parse errors; returning original response preserves existing behavior.
            }

            return response;
        };

        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason;
            if (reason instanceof Error) {
                maybeShowFromMessage(reason.message);
                return;
            }
            maybeShowFromMessage(String(reason));
        };

        const handleWindowError = (event: ErrorEvent) => {
            maybeShowFromMessage(event.message);
        };

        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        window.addEventListener('error', handleWindowError);

        return () => {
            window.fetch = originalFetch;
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
            window.removeEventListener('error', handleWindowError);
        };
    }, []);

    return null;
}
