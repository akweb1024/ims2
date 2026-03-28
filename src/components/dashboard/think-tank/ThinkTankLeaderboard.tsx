'use client';

import { useEffect, useState } from 'react';

type Contributor = {
    userId: string;
    name: string;
    designation: string | null;
    ideaCount: number;
    totalScore: number;
    topIdeaTopic: string;
    topIdeaScore: number;
};

type TopIdea = {
    id: string;
    topic: string;
    category: string;
    weightedScore: number;
    voteCount: number;
    reviewStage: string;
};

const MEDALS = ['🥇', '🥈', '🥉', '④', '⑤'];
const RANK_COLORS = [
    'border-l-[3px] border-l-[#FF4500]',
    'border-l-[3px] border-l-slate-400',
    'border-l-[3px] border-l-amber-700',
    'border-l-[3px] border-l-slate-300',
    'border-l-[3px] border-l-slate-200',
];

export default function ThinkTankLeaderboard() {
    const [contributors, setContributors] = useState<Contributor[]>([]);
    const [topIdeas, setTopIdeas] = useState<TopIdea[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'thinkers' | 'ideas'>('thinkers');

    useEffect(() => {
        fetch('/api/think-tank/leaderboard', { cache: 'no-store' })
            .then((res) => res.ok ? res.json() : null)
            .then((payload) => {
                if (!payload) return;
                setContributors(payload.leaderboard?.contributors || []);
                setTopIdeas(payload.leaderboard?.ideas || []);
            })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="border border-slate-200 bg-white" style={{ animation: 'tt-fade-up 0.5s ease both 0.1s' }}>
            {/* Header */}
            <div className="flex items-stretch border-b border-slate-200">
                <div className="flex-1 p-5 border-r border-slate-200">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Innovation</p>
                    <h2 className="mt-1 text-xl font-black text-slate-950 tracking-tight">Leaderboard</h2>
                </div>
                <div className="flex">
                    <button
                        onClick={() => setTab('thinkers')}
                        className={`px-5 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${tab === 'thinkers' ? 'bg-[#FF4500] text-white' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Thinkers
                    </button>
                    <button
                        onClick={() => setTab('ideas')}
                        className={`px-5 py-3 text-xs font-bold uppercase tracking-widest transition-colors border-l border-slate-200 ${tab === 'ideas' ? 'bg-[#FF4500] text-white' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        Ideas
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-10 text-xs uppercase tracking-widest text-slate-400">
                    Loading…
                </div>
            ) : tab === 'thinkers' ? (
                <div>
                    {contributors.length === 0 ? (
                        <div className="p-8 text-sm text-slate-500">No contributors yet this cycle.</div>
                    ) : contributors.map((c, i) => (
                        <div key={c.userId} className={`flex items-center gap-4 px-5 py-4 border-b border-slate-100 last:border-0 ${RANK_COLORS[i]} transition-all hover:bg-slate-50`}>
                            <div className="w-8 text-lg text-center shrink-0">{MEDALS[i] ?? `#${i + 1}`}</div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-slate-900 text-sm truncate">{c.name}</div>
                                {c.designation && <div className="text-xs text-slate-500 truncate">{c.designation}</div>}
                                <div className="mt-1 text-xs text-slate-400 truncate">Top: {c.topIdeaTopic}</div>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="text-lg font-black text-slate-950">{c.totalScore}</div>
                                <div className="text-[10px] uppercase tracking-widest text-slate-400">{c.ideaCount} idea{c.ideaCount !== 1 ? 's' : ''}</div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div>
                    {topIdeas.length === 0 ? (
                        <div className="p-8 text-sm text-slate-500">No ideas to rank yet.</div>
                    ) : topIdeas.map((idea, i) => (
                        <div key={idea.id} className={`flex items-center gap-4 px-5 py-4 border-b border-slate-100 last:border-0 ${RANK_COLORS[i]} transition-all hover:bg-slate-50`}>
                            <div className="w-8 text-lg text-center shrink-0">{MEDALS[i] ?? `#${i + 1}`}</div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-slate-900 text-sm truncate">{idea.topic}</div>
                                <div className="text-xs text-slate-500 uppercase tracking-wider">{idea.category.replace(/_/g, ' ')}</div>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="text-lg font-black text-slate-950">{idea.weightedScore}</div>
                                <div className="text-[10px] uppercase tracking-widest text-slate-400">{idea.voteCount} votes</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
