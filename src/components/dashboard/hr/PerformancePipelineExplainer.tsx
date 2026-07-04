'use client';

import { ClipboardList, FileText, CheckCircle2, Trophy, ArrowRight, ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface Step {
    icon: React.ReactNode;
    title: string;
    text: string;
    /** Command-center tab to open when clicked (omit for info-only steps). */
    tab?: string;
    tabLabel?: string;
}

const STEPS: Step[] = [
    {
        icon: <ClipboardList size={18} />,
        title: '1 · Plan',
        text: "The day's agenda and mandatory tasks are set for each employee (work agenda + task checklists).",
    },
    {
        icon: <FileText size={18} />,
        title: '2 · Report',
        text: 'The employee submits ONE daily work report: ticks their task checklist and enters the numbers (calls, revenue, tickets…).',
    },
    {
        icon: <CheckCircle2 size={18} />,
        title: '3 · Review',
        text: 'The manager validates the report — approves or rejects each task, scores the day, and clears any flagged numbers.',
        tab: 'reports',
        tabLabel: 'Open Work Reports',
    },
    {
        icon: <Trophy size={18} />,
        title: '4 · Score',
        text: 'Approved tasks award points; verified numbers roll into KRA goal achievement, ratings and incentives.',
        tab: 'points',
        tabLabel: 'Open Points & Rewards',
    },
];

/**
 * Compact pipeline explainer for the HR Command Center — one glance shows how
 * Task Checklists, Work Reports, Goals (KRA) and Points relate to each other.
 */
export default function PerformancePipelineExplainer({ onNavigate }: { onNavigate: (tab: string) => void }) {
    const [open, setOpen] = useState(false);

    return (
        <section className="card-premium border border-secondary-100 overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-secondary-50/50 transition-colors"
                aria-expanded={open}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary-700 shrink-0">How performance works</p>
                    <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-secondary-400 truncate">
                        Plan <ArrowRight size={11} /> Report <ArrowRight size={11} /> Review <ArrowRight size={11} /> Score
                    </div>
                </div>
                <ChevronDown size={16} className={`shrink-0 text-secondary-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 pt-0">
                    {STEPS.map((step) => (
                        <div key={step.title} className="rounded-xl border border-secondary-100 bg-white p-4 flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-primary-600">
                                {step.icon}
                                <span className="text-xs font-black uppercase tracking-widest text-secondary-900">{step.title}</span>
                            </div>
                            <p className="text-xs text-secondary-600 leading-relaxed flex-1">{step.text}</p>
                            {step.tab && (
                                <button
                                    onClick={() => onNavigate(step.tab!)}
                                    className="self-start text-[11px] font-black text-primary-600 hover:text-primary-800 inline-flex items-center gap-1"
                                >
                                    {step.tabLabel} <ArrowRight size={11} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
