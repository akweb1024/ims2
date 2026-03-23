'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, LayoutGrid, MessageSquare } from 'lucide-react';

const items = [
    {
        label: 'Hub',
        href: '/dashboard/conferences',
        icon: LayoutGrid,
        description: 'Overview and module entry points',
    },
    {
        label: 'All Conferences',
        href: '/dashboard/conferences/all',
        icon: Calendar,
        description: 'Browse and manage every conference',
    },
    {
        label: 'Follow-ups',
        href: '/dashboard/conferences/followups',
        icon: MessageSquare,
        description: 'Conference and registration follow-up queues',
    },
];

export default function ConferenceModuleNav() {
    const pathname = usePathname();

    return (
        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/90 p-3 shadow-[0_16px_50px_rgba(15,23,42,0.06)] backdrop-blur">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || (item.href !== '/dashboard/conferences' && pathname.startsWith(item.href));

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`group rounded-2xl border p-4 transition-all ${active
                            ? 'border-sky-300 bg-[linear-gradient(135deg,_rgba(14,165,233,0.12),_rgba(59,130,246,0.06))] shadow-lg shadow-sky-100'
                            : 'border-slate-200 bg-white hover:border-sky-200 hover:shadow-md'
                            }`}
                    >
                        <div className="flex items-start gap-3">
                            <div className={`rounded-xl p-2 transition-colors ${active ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700 group-hover:bg-sky-50 group-hover:text-sky-700'}`}>
                                <Icon size={18} />
                            </div>
                            <div>
                                <div className="font-black text-slate-900">{item.label}</div>
                                <div className="text-sm text-slate-500 mt-1">{item.description}</div>
                            </div>
                        </div>
                    </Link>
                );
            })}
            </div>
        </div>
    );
}
