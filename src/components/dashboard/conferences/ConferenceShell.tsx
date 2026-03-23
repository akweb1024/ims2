'use client';

import { ReactNode } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ConferenceModuleNav from '@/components/dashboard/conferences/ConferenceModuleNav';

type ConferenceShellProps = {
    userRole: string;
    title: string;
    subtitle: string;
    badge?: string;
    actions?: ReactNode;
    stats?: ReactNode;
    children: ReactNode;
};

export default function ConferenceShell({
    userRole,
    title,
    subtitle,
    badge = 'Conference Workspace',
    actions,
    stats,
    children,
}: ConferenceShellProps) {
    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                <section className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.22),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.18),_transparent_24%),linear-gradient(135deg,_#f8fdff_0%,_#eef6ff_48%,_#f8fafc_100%)] p-6 md:p-8 shadow-[0_24px_60px_rgba(14,165,233,0.10)]">
                    <div className="absolute inset-0 opacity-40 pointer-events-none">
                        <div className="absolute -top-12 left-10 h-32 w-32 rounded-full bg-sky-300/30 blur-3xl" />
                        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-300/25 blur-3xl" />
                        <div className="absolute bottom-0 left-1/3 h-24 w-48 rounded-full bg-cyan-200/20 blur-3xl" />
                    </div>

                    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center rounded-full border border-sky-200 bg-white/70 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-sky-700 shadow-sm backdrop-blur">
                                {badge}
                            </div>
                            <h1 className="mt-4 text-3xl md:text-4xl font-black tracking-tight text-slate-950">
                                {title}
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm md:text-base leading-7 text-slate-600">
                                {subtitle}
                            </p>
                        </div>
                        {actions ? <div className="relative z-10">{actions}</div> : null}
                    </div>

                    {stats ? (
                        <div className="relative mt-6">
                            {stats}
                        </div>
                    ) : null}
                </section>

                <ConferenceModuleNav />

                {children}
            </div>
        </DashboardLayout>
    );
}
