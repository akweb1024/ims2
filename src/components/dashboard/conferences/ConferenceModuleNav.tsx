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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`rounded-2xl border p-4 transition-all ${active
                            ? 'border-primary-300 bg-primary-50 shadow-lg shadow-primary-100'
                            : 'border-secondary-200 bg-white hover:border-primary-200 hover:shadow-md'
                            }`}
                    >
                        <div className="flex items-start gap-3">
                            <div className={`rounded-xl p-2 ${active ? 'bg-primary-600 text-white' : 'bg-secondary-100 text-secondary-700'}`}>
                                <Icon size={18} />
                            </div>
                            <div>
                                <div className="font-black text-secondary-900">{item.label}</div>
                                <div className="text-sm text-secondary-500 mt-1">{item.description}</div>
                            </div>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
