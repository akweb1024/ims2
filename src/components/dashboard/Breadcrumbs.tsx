'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { useMemo } from 'react';
import { ALL_MODULES } from '@/config/navigation';

// Slugs that should keep their canonical casing instead of Title Case.
const ACRONYMS: Record<string, string> = {
    hr: 'HR', kra: 'KRA', crm: 'CRM', it: 'IT', lms: 'LMS', ai: 'AI',
    sop: 'SOP', coa: 'CoA', 'hr-management': 'HR Management',
    'it-management': 'IT Management', 'ai-insights': 'AI Insights',
    'ai-consultant': 'AI Consultant',
};

// Segments that are database ids (uuid or long opaque tokens) — shown as a
// friendly label instead of the raw id.
const ID_RE = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[a-z0-9]{20,})$/i;

function humanize(segment: string): string {
    if (ACRONYMS[segment]) return ACRONYMS[segment];
    if (ID_RE.test(segment)) return 'Details';
    return segment
        .split('-')
        .map((w) => (ACRONYMS[w] ? ACRONYMS[w] : w.charAt(0).toUpperCase() + w.slice(1)))
        .join(' ');
}

// Paths that are safe to link to = every href in the sidebar nav config
// (query-stripped). Anything else renders as plain text so a breadcrumb can
// never lead to a 404 (several intermediate URL segments have no page).
function useLinkablePaths(): Set<string> {
    return useMemo(() => {
        const paths = new Set<string>(['/dashboard']);
        for (const mod of ALL_MODULES) {
            for (const cat of mod.categories) {
                for (const item of cat.items) {
                    paths.add(item.href.split('?')[0]);
                }
            }
        }
        return paths;
    }, []);
}

/**
 * Auto breadcrumbs for dashboard pages, driven purely by the URL.
 * Renders nothing at the top two levels (/dashboard, /dashboard/x) — it only
 * appears where orientation is actually needed (2+ levels deep).
 */
export default function Breadcrumbs() {
    const pathname = usePathname();
    const linkable = useLinkablePaths();

    if (!pathname?.startsWith('/dashboard')) return null;
    const segments = pathname.split('/').filter(Boolean).slice(1); // drop 'dashboard'
    if (segments.length < 2) return null;

    const crumbs = segments.map((segment, i) => {
        const href = '/dashboard/' + segments.slice(0, i + 1).join('/');
        return { label: humanize(segment), href, isLast: i === segments.length - 1 };
    });

    return (
        <nav aria-label="Breadcrumb" className="mb-4 -mt-1">
            <ol className="flex items-center flex-wrap gap-1 text-xs font-semibold text-secondary-400">
                <li>
                    <Link href="/dashboard" className="flex items-center gap-1 hover:text-primary-600 transition-colors" aria-label="Dashboard home">
                        <Home size={12} aria-hidden="true" />
                    </Link>
                </li>
                {crumbs.map((crumb) => (
                    <li key={crumb.href} className="flex items-center gap-1">
                        <ChevronRight size={12} className="text-secondary-300" aria-hidden="true" />
                        {crumb.isLast ? (
                            <span aria-current="page" className="text-secondary-700 font-bold">{crumb.label}</span>
                        ) : linkable.has(crumb.href) ? (
                            <Link href={crumb.href} className="hover:text-primary-600 transition-colors">{crumb.label}</Link>
                        ) : (
                            <span>{crumb.label}</span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}
