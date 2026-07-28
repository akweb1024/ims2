'use client';

/**
 * Presentation pieces shared by every IT surface that speaks the lifecycle language
 * (see `@/lib/it/lifecycle`): the stage tab bar, the "did it actually start?" pill and the
 * stack of people working on something. Each renders on both the dark IT shell and the
 * light tickets queue via the `tone` prop.
 */

import { motion } from 'framer-motion';
import {
    AlertTriangle, Archive, CalendarClock, CheckCircle2, CircleDashed,
    PauseCircle, PlayCircle, Users, XCircle, type LucideIcon,
} from 'lucide-react';
import {
    LIFECYCLE_THEME, lifecycleLabel,
    type LifecycleKey, type StartState, type StartTone,
} from '@/lib/it/lifecycle';

export type Tone = 'dark' | 'light';

/* ═══ Lifecycle tabs ══════════════════════════════════════════════════════ */

export const LIFECYCLE_ICON: Record<LifecycleKey, LucideIcon> = {
    RUNNING: PlayCircle,
    UPCOMING: CalendarClock,
    ON_HOLD: PauseCircle,
    COMPLETED: CheckCircle2,
    FAILED: XCircle,
    ARCHIVED: Archive,
};

interface LifecycleTabsProps {
    /** Currently selected stage, or 'ALL'. */
    value: LifecycleKey | 'ALL';
    onChange: (value: LifecycleKey | 'ALL') => void;
    /** Stages to render, in order. */
    stages: LifecycleKey[];
    counts: Record<string, number>;
    total: number;
    labels?: Partial<Record<LifecycleKey, string>>;
    allLabel?: string;
    tone?: Tone;
}

export function LifecycleTabs({
    value, onChange, stages, counts, total, labels, allLabel = 'Everything', tone = 'dark',
}: LifecycleTabsProps) {
    const isDark = tone === 'dark';
    const shell = isDark
        ? 'bg-slate-800/70 border-white/10'
        : 'bg-white/70 border-white shadow-lg shadow-slate-200/40';

    const idle = isDark
        ? 'border-white/10 bg-slate-700/40 text-slate-400 hover:text-white hover:bg-slate-700/70'
        : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-300';

    return (
        <div className={`backdrop-blur border rounded-2xl p-2 flex items-center gap-2 overflow-x-auto no-scrollbar ${shell}`}>
            <button
                onClick={() => onChange('ALL')}
                className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all ${
                    value === 'ALL'
                        ? isDark
                            ? 'bg-white/10 border-white/20 text-white'
                            : 'bg-slate-900 border-slate-900 text-white'
                        : idle
                }`}
            >
                {allLabel}
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${isDark ? 'bg-black/30' : 'bg-black/10'}`}>
                    {total}
                </span>
            </button>

            <div className={`h-6 w-px shrink-0 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />

            {stages.map(stage => {
                const theme = LIFECYCLE_THEME[stage];
                const skin = isDark ? theme.dark : theme.light;
                const active = value === stage;
                const Icon = LIFECYCLE_ICON[stage];
                return (
                    <button
                        key={stage}
                        onClick={() => onChange(active ? 'ALL' : stage)}
                        title={theme.blurb}
                        className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all ${
                            active ? `${skin.bg} ${skin.border} ${skin.text} shadow-lg ${theme.glow}` : idle
                        }`}
                    >
                        <span className="relative flex h-1.5 w-1.5">
                            {stage === 'RUNNING' && (
                                <span className={`absolute inline-flex h-full w-full rounded-full ${theme.dot} opacity-70 animate-ping`} />
                            )}
                            <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${theme.dot}`} />
                        </span>
                        <Icon className="h-3.5 w-3.5" />
                        {lifecycleLabel(stage, labels)}
                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${isDark ? 'bg-black/30' : 'bg-black/10'}`}>
                            {counts[stage] ?? 0}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

/* ═══ Stage section heading (used when "Everything" groups by stage) ══════ */

export function LifecycleHeading({
    stage, count, labels, tone = 'dark',
}: { stage: LifecycleKey; count: number; labels?: Partial<Record<LifecycleKey, string>>; tone?: Tone }) {
    const theme = LIFECYCLE_THEME[stage];
    const isDark = tone === 'dark';
    const skin = isDark ? theme.dark : theme.light;
    const Icon = LIFECYCLE_ICON[stage];
    // The heading sits on its own surface rather than the page background, so it stays
    // legible whether the dashboard shell is rendering light or dark.
    return (
        <div className={`flex items-center gap-3 rounded-2xl border px-4 py-2.5 ${
            isDark ? 'bg-slate-800/80 border-white/10' : 'bg-white border-slate-200 shadow-sm'
        }`}>
            <div className={`p-2 rounded-xl border ${skin.bg} ${skin.border} ${skin.text}`}>
                <Icon className="h-4 w-4" />
            </div>
            <div>
                <h2 className={`text-sm font-black uppercase tracking-widest ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {lifecycleLabel(stage, labels)}
                    <span className={`ml-2 ${skin.text}`}>{count}</span>
                </h2>
                <p className={`text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                    {theme.blurb}
                </p>
            </div>
            <div className={`flex-1 h-px ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
        </div>
    );
}

/* ═══ Start / timing pill ═════════════════════════════════════════════════ */

const START_ICON: Record<StartTone, LucideIcon> = {
    idle: CircleDashed,
    scheduled: CalendarClock,
    live: PlayCircle,
    late: AlertTriangle,
    done: CheckCircle2,
    stopped: XCircle,
};

const START_SKIN: Record<StartTone, Record<Tone, string>> = {
    idle: {
        dark: 'bg-slate-700/50 text-slate-400 border-white/10',
        light: 'bg-slate-100 text-slate-500 border-slate-200',
    },
    scheduled: {
        dark: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
        light: 'bg-violet-50 text-violet-600 border-violet-200',
    },
    live: {
        dark: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
        light: 'bg-blue-50 text-blue-600 border-blue-200',
    },
    late: {
        dark: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        light: 'bg-rose-50 text-rose-600 border-rose-200',
    },
    done: {
        dark: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        light: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    },
    stopped: {
        dark: 'bg-slate-600/30 text-slate-400 border-white/10',
        light: 'bg-slate-100 text-slate-400 border-slate-200',
    },
};

export function StartPill({
    state, tone = 'dark', className = '',
}: { state: StartState; tone?: Tone; className?: string }) {
    const Icon = START_ICON[state.tone];
    return (
        <span
            title={state.detail}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${START_SKIN[state.tone][tone]} ${className}`}
        >
            {state.tone === 'live' ? (
                <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-400" />
                </span>
            ) : (
                <Icon className="h-3 w-3" />
            )}
            {state.label}
        </span>
    );
}

/* ═══ People stack ════════════════════════════════════════════════════════ */

export interface StackPerson {
    id: string;
    name?: string | null;
    email?: string | null;
    /** e.g. "Manager", "Lead", "Assignee", "Requester". */
    role?: string | null;
    /** e.g. "3 open · 2 done". */
    note?: string | null;
}

const AVATAR_SKINS = [
    'bg-blue-600', 'bg-indigo-600', 'bg-violet-600', 'bg-emerald-600',
    'bg-amber-600', 'bg-rose-600', 'bg-cyan-600', 'bg-fuchsia-600',
];

function avatarSkin(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    return AVATAR_SKINS[hash % AVATAR_SKINS.length];
}

export function personLabel(p: StackPerson): string {
    return p.name?.trim() || p.email?.split('@')[0] || 'Unknown';
}

function initials(p: StackPerson): string {
    const label = personLabel(p);
    const parts = label.split(/[\s._-]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return label.slice(0, 2).toUpperCase();
}

interface PeopleStackProps {
    people: StackPerson[];
    max?: number;
    tone?: Tone;
    size?: 'sm' | 'md';
    /** Caption after the avatars, e.g. "working". Pass null to hide it. */
    caption?: string | null;
    emptyLabel?: string;
}

export function PeopleStack({
    people, max = 4, tone = 'dark', size = 'md', caption = 'working', emptyLabel = 'Nobody assigned',
}: PeopleStackProps) {
    const isDark = tone === 'dark';
    const box = size === 'sm' ? 'h-6 w-6 text-[9px]' : 'h-7 w-7 text-[10px]';
    const ring = isDark ? 'ring-slate-800' : 'ring-white';

    if (people.length === 0) {
        return (
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                <Users className="h-3.5 w-3.5" /> {emptyLabel}
            </span>
        );
    }

    const shown = people.slice(0, max);
    const overflow = people.length - shown.length;

    return (
        <div className="flex items-center gap-2 min-w-0">
            <div className="flex -space-x-2">
                {shown.map((p, i) => (
                    <motion.div
                        key={p.id}
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.04 }}
                        title={[personLabel(p), p.role, p.note].filter(Boolean).join(' · ')}
                        className={`${box} ${avatarSkin(p.id)} rounded-lg ring-2 ${ring} flex items-center justify-center font-black text-white shrink-0`}
                    >
                        {initials(p)}
                    </motion.div>
                ))}
                {overflow > 0 && (
                    <div
                        title={people.slice(max).map(personLabel).join(', ')}
                        className={`${box} rounded-lg ring-2 ${ring} flex items-center justify-center font-black shrink-0 ${
                            isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'
                        }`}
                    >
                        +{overflow}
                    </div>
                )}
            </div>
            {caption && (
                <span className={`text-[10px] font-bold truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {people.length} {caption}
                </span>
            )}
        </div>
    );
}
