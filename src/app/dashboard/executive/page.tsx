import { redirect } from 'next/navigation';

// The Command Center merged into AI Predictions (Executive Summary tab),
// which renders the same /api/ai-insights?type=executive payload. This stub
// only protects old bookmarks.
export default function ExecutiveDashboardPage() {
    redirect('/dashboard/ai-insights');
}
