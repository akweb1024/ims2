'use client';

import { useCallback, useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../DashboardLayout';
import ThinkTankLeaderboard from './ThinkTankLeaderboard';
import AIInsightsPanel from './AIInsightsPanel';
import IdeaSubmissionForm from './IdeaSubmissionForm';

// Animation and Design Tokens - Swiss-Bauhaus Remix
const TT_ANIMATIONS = `
@keyframes tt-fade-up {
  from { opacity: 0; transform: translateY(20px); filter: blur(5px); }
  to { opacity: 1; transform: translateY(0); filter: blur(0); }
}
`;

type PortalMode = 'dashboard' | 'my-ideas' | 'vote' | 'results';
type ThinkTankAcknowledgementKey = 'my-ideas' | 'vote' | 'results';

type Idea = {
    id: string;
    topic: string;
    description: string;
    category: string;
    status: string;
    reviewStage?: string;
    implementationStatus?: string;
    decisionNotes?: string | null;
    weightedScore: number;
    communityScore?: number;
    reviewerScore?: number;
    finalScore?: number;
    ideaReadinessScore?: number;
    voteCount: number;
    currentVote?: {
        id: string;
        vote: 'LIKE' | 'UNLIKE' | 'NEUTRAL';
        pointAllocation: number;
        maxAllowedPoints: number;
        weightedValue: number;
        updatedAt: string;
    } | null;
    questionCount?: number;
    isVetoed?: boolean;
    vetoedAt?: string | null;
    vetoReason?: string | null;
    createdAt: string;
    revealedAt?: string | null;
    executionLink?: { type: string; id: string; title: string; convertedAt?: string; convertedById?: string } | null;
    author?: { id: string; name?: string | null; email?: string | null } | null;
    decisionBy?: { id: string; name?: string | null; email?: string | null } | null;
    attachments?: Array<{ id: string; url: string; filename: string; size: number; scrubStatus?: string | null }>;
    partners?: Array<{ id: string; roleType: string; user?: { id: string; name?: string | null; email?: string | null } | null }>;
    teamMembers?: Array<{ id: string; roleType: string; user?: { id: string; name?: string | null; email?: string | null } | null }>;
    comments?: Array<{
        id: string;
        content: string;
        isInternal: boolean;
        createdAt: string;
        updatedAt: string;
        author?: { id: string; name?: string | null; email?: string | null } | null;
    }>;
    questions?: Array<{
        id: string;
        question: string;
        answer?: string | null;
        status: string;
        createdAt: string;
        updatedAt: string;
        answeredAt?: string | null;
        askedBy?: { id: string; name?: string | null; email?: string | null } | null;
        answeredBy?: { id: string; name?: string | null; email?: string | null } | null;
        askedByLabel?: string;
        answeredByLabel?: string;
    }>;
    reviewerScores?: Array<{
        id: string;
        impactScore: number;
        feasibilityScore: number;
        costScore: number;
        speedScore: number;
        strategicFitScore: number;
        scalabilityScore: number;
        totalScore: number;
        note?: string | null;
        createdAt: string;
        updatedAt: string;
        reviewer?: { id: string; name?: string | null; email?: string | null } | null;
    }>;
    analytics?: {
        voteCount: number;
        weightedScore: number;
        voteBreakdown?: { like: number; unlike: number; neutral: number };
    };
    duplicateMatches?: Array<{
        id: string;
        similarityScore: number;
        decision: string;
        matchedIdea: {
            id: string;
            topic: string;
            category: string;
            status: string;
            weightedScore: number;
            voteCount: number;
        };
    }>;
};

const CATEGORIES = [
    { value: 'PUBLICATION', label: 'Publication' },
    { value: 'MARKETING', label: 'Marketing' },
    { value: 'SALES', label: 'Sales' },
    { value: 'ELEARNING', label: 'Elearning' },
    { value: 'CHEMICAL', label: 'Chemical' },
    { value: 'SFT_APPS', label: 'Sft & Apps' },
    { value: 'GLOBAL', label: 'Global' },
    { value: 'OTHER', label: 'Other' },
    { value: 'ACCOUNTS', label: 'Accounts' },
];

const formatDateTime = (value?: string | null) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata',
    }).format(date);
};

const formatThinkTankLabel = (value?: string | null, fallback = 'Uncategorized') => {
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim();
    if (!normalized) return fallback;
    return normalized.replace(/_/g, ' ');
};

const REVIEW_SCORE_FIELDS = [
    { key: 'impactScore', label: 'Impact' },
    { key: 'feasibilityScore', label: 'Feasibility' },
    { key: 'costScore', label: 'Cost' },
    { key: 'speedScore', label: 'Speed' },
    { key: 'strategicFitScore', label: 'Strategic Fit' },
    { key: 'scalabilityScore', label: 'Scalability' },
] as const;

const THINK_TANK_GUIDELINES: Record<ThinkTankAcknowledgementKey, { title: string; items: string[]; acknowledgement: string }> = {
    'my-ideas': {
        title: 'Idea Submission Guidelines',
        items: [
            'Share one clear idea per submission with the expected impact, problem statement, and implementation direction.',
            'Do not submit confidential customer data, passwords, pricing secrets, or personal employee information inside the idea text or attachments.',
            'Check for duplicate ideas and use the merge option when your idea is substantially similar to an existing proposal.',
            'List only genuine collaborators. Self-opted partners should be people who are actually aligned to help execute the idea.',
        ],
        acknowledgement: 'I understand the submission guidelines and confirm this idea is original, professional, and safe to share internally.',
    },
    vote: {
        title: 'Voting Guidelines',
        items: [
            'Vote based on idea quality, business value, feasibility, and strategic fit, not on personal relationships.',
            'Use your cycle points carefully. Points spent on one idea reduce the points available for other ideas in the same cycle.',
            'Do not try to identify anonymous planners before reveal, and do not coordinate voting groups to manipulate outcomes.',
            'Use the Q&A section if you need clarity before spending points on an idea.',
        ],
        acknowledgement: 'I understand the voting guidelines and will use my points fairly and independently.',
    },
    results: {
        title: 'Results Review Guidelines',
        items: [
            'Results should be used for learning, recognition, and execution planning, not for public criticism of individuals or teams.',
            'Respect revealed planners, partners, and reviewers. Continue discussion through comments and Q&A in a professional tone.',
            'A veto, shortlist, or rejection is part of governance and should be interpreted in context with reviewer notes and business constraints.',
            'Use results to identify strong ideas, implementation opportunities, and lessons for better future submissions.',
        ],
        acknowledgement: 'I understand the results-review guidelines and will use the revealed information professionally.',
    },
};

export default function ThinkTankPortal({ mode, ideaId }: { mode: PortalMode; ideaId?: string }) {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [assignees, setAssignees] = useState<Array<{ id: string; name?: string | null; email?: string | null; designation?: string | null }>>([]);
    const [loading, setLoading] = useState(true);
    const [governance, setGovernance] = useState<any>(null);
    const [governanceAccess, setGovernanceAccess] = useState<{ canManage?: boolean; override?: any } | null>(null);
    const [pointAccount, setPointAccount] = useState<{ basePoints: number; maxPerIdeaPoints: number; allocatedPoints: number; remainingPoints: number } | null>(null);
    const [canVeto, setCanVeto] = useState(false);
    const [acknowledgements, setAcknowledgements] = useState<Record<ThinkTankAcknowledgementKey, boolean>>({
        'my-ideas': false,
        vote: false,
        results: false,
    });
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [reviewIdeas, setReviewIdeas] = useState<Idea[]>([]);
    const [results, setResults] = useState<Idea[]>([]);
    const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
    const [analytics, setAnalytics] = useState<any>(null);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [updatingGovernance, setUpdatingGovernance] = useState(false);
    const [overrideForm, setOverrideForm] = useState({
        mode: 'SCHEDULED',
        reason: '',
    });

    const view = mode === 'my-ideas' ? 'my' : mode === 'results' ? 'results' : 'vote';

    useEffect(() => {
        const rawUser = localStorage.getItem('user');
        if (!rawUser) return;
        try {
            const parsed = JSON.parse(rawUser);
            setUser(parsed);
            const acknowledgementKeyBase = `think-tank-guidelines:${parsed?.id || 'anonymous'}`;
            setAcknowledgements({
                'my-ideas': localStorage.getItem(`${acknowledgementKeyBase}:my-ideas`) === 'true',
                vote: localStorage.getItem(`${acknowledgementKeyBase}:vote`) === 'true',
                results: localStorage.getItem(`${acknowledgementKeyBase}:results`) === 'true',
            });
        } catch {
        }
    }, []);

    const acknowledgeGuidelines = useCallback((key: ThinkTankAcknowledgementKey) => {
        setAcknowledgements((current) => ({ ...current, [key]: true }));
        if (typeof window !== 'undefined') {
            const acknowledgementKeyBase = `think-tank-guidelines:${user?.id || 'anonymous'}`;
            localStorage.setItem(`${acknowledgementKeyBase}:${key}`, 'true');
        }
    }, [user?.id]);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const [ideasRes, resultsRes, governanceRes, analyticsRes, usersRes] = await Promise.all([
                fetch(`/api/think-tank/ideas?view=${view}`, { cache: 'no-store' }),
                fetch('/api/think-tank/results', { cache: 'no-store' }),
                fetch('/api/think-tank/governance', { cache: 'no-store' }),
                fetch('/api/think-tank/analytics', { cache: 'no-store' }),
                fetch('/api/users?limit=100', { cache: 'no-store' }),
            ]);
            const ideasPayload = await ideasRes.json();
            const resultsPayload = await resultsRes.json();
            const governancePayload = await governanceRes.json();
            const analyticsPayload = await analyticsRes.json();
            const usersPayload = usersRes.ok ? await usersRes.json() : { data: [] };
            let reviewPayload: any = null;
            const reviewRes = await fetch('/api/think-tank/ideas?view=review', { cache: 'no-store' });
            if (reviewRes.ok) {
                reviewPayload = await reviewRes.json();
            }
            setGovernance(ideasPayload.governance || null);
            setGovernanceAccess({
                canManage: governancePayload.canManage,
                override: governancePayload.override,
            });
            setOverrideForm({
                mode: governancePayload.override?.mode || 'SCHEDULED',
                reason: governancePayload.override?.reason || '',
            });
            setIdeas(ideasPayload.ideas || []);
            setReviewIdeas(reviewPayload?.ideas || []);
            setResults(resultsPayload.ideas || []);
            setAnalytics(analyticsPayload.analytics || null);
            setPointAccount(ideasPayload.pointAccount || null);
            setCanVeto(Boolean(ideasPayload.canVeto));
            setAssignees((usersPayload.data || []).map((candidate: any) => ({
                id: candidate.id,
                name: candidate.name,
                email: candidate.email,
                designation: candidate.employeeProfile?.designatRef?.name || candidate.employeeProfile?.designation || candidate.role || null,
            })));

            if (mode === 'vote' && ideaId) {
                const ideaRes = await fetch(`/api/think-tank/ideas/${ideaId}`, { cache: 'no-store' });
                const ideaPayload = await ideaRes.json();
                if (!ideaRes.ok) {
                    throw new Error(ideaPayload.error || 'Failed to load selected idea.');
                }
                setSelectedIdea(ideaPayload.idea || null);
            } else {
                setSelectedIdea(null);
            }
        } catch (fetchError) {
            setError(fetchError instanceof Error ? fetchError.message : 'Failed to load Think Tank ideas.');
        } finally {
            setLoading(false);
        }
    }, [ideaId, mode, view]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const dashboardStats = useMemo(() => {
        const votePool = ideas.filter((idea) => idea.status !== 'REVEALED');
        return {
            activeIdeas: votePool.length,
            resultIdeas: results.length,
            topScore: [...results, ...ideas].reduce((max, idea) => Math.max(max, idea.weightedScore || 0), 0),
        };
    }, [ideas, results]);



    const handleVote = async (ideaId: string, vote: 'LIKE' | 'UNLIKE' | 'NEUTRAL') => {
        await handleVoteWithPoints(ideaId, vote, pointAccount?.maxPerIdeaPoints || 0);
    };

    const handleVoteWithPoints = async (ideaId: string, vote: 'LIKE' | 'UNLIKE' | 'NEUTRAL', pointAllocation: number) => {
        setError('');
        const response = await fetch(`/api/think-tank/ideas/${ideaId}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vote, pointAllocation }),
        });
        const payload = await response.json();
        if (!response.ok) {
            setError(payload.message || payload.error || 'Unable to save vote.');
            return;
        }
        await refresh();
    };

    const handleGovernanceUpdate = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        setUpdatingGovernance(true);
        try {
            const response = await fetch('/api/think-tank/governance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: overrideForm.mode,
                    reason: overrideForm.reason,
                }),
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.error || 'Failed to update governance override.');
            }
            await refresh();
        } catch (governanceError: any) {
            setError(governanceError.message || 'Failed to update governance override.');
        } finally {
            setUpdatingGovernance(false);
        }
    };

    const handleReviewUpdate = async (ideaId: string, payload: { reviewStage?: string; implementationStatus?: string; decisionNotes?: string }) => {
        setError('');
        const response = await fetch(`/api/think-tank/ideas/${ideaId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const body = await response.json();
        if (!response.ok) {
            setError(body.error || 'Failed to update review workflow.');
            return;
        }
        await refresh();
    };

    const handleAddComment = async (ideaId: string, content: string) => {
        setError('');
        const response = await fetch(`/api/think-tank/ideas/${ideaId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
        });
        const payload = await response.json();
        if (!response.ok) {
            setError(payload.error || 'Failed to add comment.');
            return;
        }
        await refresh();
    };

    const handleConvertIdea = async (ideaId: string, payload: {
        mode: 'PROJECT' | 'TASK';
        ownerUserId?: string;
        memberIds?: string[];
        title?: string;
        description?: string;
        priority?: string;
        startDate?: string;
        endDate?: string;
        dueDate?: string;
    }) => {
        setError('');
        const response = await fetch(`/api/think-tank/ideas/${ideaId}/convert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const body = await response.json();
        if (!response.ok) {
            setError(body.error || 'Failed to convert idea into execution work.');
            return;
        }
        await refresh();
    };

    const handleAskQuestion = async (ideaId: string, question: string) => {
        setError('');
        const response = await fetch(`/api/think-tank/ideas/${ideaId}/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question }),
        });
        const payload = await response.json();
        if (!response.ok) {
            setError(payload.error || 'Failed to ask question.');
            return;
        }
        await refresh();
    };

    const handleAnswerQuestion = async (questionId: string, answer: string) => {
        setError('');
        const response = await fetch(`/api/think-tank/questions/${questionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answer }),
        });
        const payload = await response.json();
        if (!response.ok) {
            setError(payload.error || 'Failed to answer question.');
            return;
        }
        await refresh();
    };

    const handleDeleteIdea = async (ideaId: string) => {
        if (!confirm('Are you sure you want to permanently delete this idea? This action cannot be undone.')) return;
        setError('');
        try {
            const response = await fetch(`/api/think-tank/ideas/${ideaId}`, {
                method: 'DELETE',
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.error || 'Failed to delete idea.');
            }
            if (selectedIdea?.id === ideaId) setSelectedIdea(null);
            await refresh();
        } catch (deleteError: any) {
            setError(deleteError.message || 'Failed to delete idea.');
        }
    };

    const handleSaveReviewerScore = async (ideaId: string, payload: {
        impactScore: number;
        feasibilityScore: number;
        costScore: number;
        speedScore: number;
        strategicFitScore: number;
        scalabilityScore: number;
        note?: string;
    }) => {
        setError('');
        const response = await fetch(`/api/think-tank/ideas/${ideaId}/review-score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const body = await response.json();
        if (!response.ok) {
            setError(body.error || 'Failed to save reviewer score.');
            return;
        }
        await refresh();
    };

    const handleVetoIdea = async (ideaId: string, reason: string) => {
        setError('');
        const response = await fetch(`/api/think-tank/ideas/${ideaId}/veto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason }),
        });
        const body = await response.json();
        if (!response.ok) {
            setError(body.error || 'Failed to veto idea.');
            return;
        }
        await refresh();
    };

    const content = () => {
        if (loading) {
            return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Loading Think Tank workspace…</div>;
        }

        if (mode === 'my-ideas' && !acknowledgements['my-ideas']) {
            return <GuidelinesGate config={THINK_TANK_GUIDELINES['my-ideas']} onAcknowledge={() => acknowledgeGuidelines('my-ideas')} />;
        }

        if (mode === 'vote' && !acknowledgements.vote) {
            return <GuidelinesGate config={THINK_TANK_GUIDELINES.vote} onAcknowledge={() => acknowledgeGuidelines('vote')} />;
        }

        if (mode === 'results' && !acknowledgements.results) {
            return <GuidelinesGate config={THINK_TANK_GUIDELINES.results} onAcknowledge={() => acknowledgeGuidelines('results')} />;
        }

        if (mode === 'dashboard') {
            return (
                <div className="space-y-12" style={{ animation: 'tt-fade-up 0.5s ease both' }}>
                    {/* Hero Section */}
                    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
                        <div className="space-y-8">
                            <div className="border-4 border-slate-950 p-8 bg-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF4500] translate-x-16 -translate-y-16 rotate-45" />
                                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#FF4500]">Current Cycle</p>
                                <h2 className="mt-2 text-4xl font-black text-slate-950 uppercase tracking-tighter leading-none">
                                    Innovation <br/> Momentum
                                </h2>
                                <div className="mt-8 grid grid-cols-3 gap-1 bg-slate-950">
                                    <div className="bg-white p-4">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ideas</div>
                                        <div className="text-2xl font-black text-slate-950">{dashboardStats.activeIdeas}</div>
                                    </div>
                                    <div className="bg-white p-4">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Results</div>
                                        <div className="text-2xl font-black text-slate-950">{dashboardStats.resultIdeas}</div>
                                    </div>
                                    <div className="bg-white p-4">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Top Score</div>
                                        <div className="text-2xl font-black text-slate-950">{dashboardStats.topScore}</div>
                                    </div>
                                </div>
                            </div>
                            
                            <GovernanceBanner governance={governance} />
                            
                            {pointAccount && (
                                <div className="border-2 border-slate-950 bg-[#FF4500] p-6 text-white flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Your Voting Power</p>
                                        <div className="text-3xl font-black tracking-tighter">{pointAccount.remainingPoints} PT.</div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Remaining</p>
                                        <p className="text-sm font-bold">Of {pointAccount.basePoints} Total</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-8">
                            <ThinkTankLeaderboard />
                        </div>
                    </div>

                    <IdeaGrid
                        title="Ideas Open for Vote"
                        ideas={ideas}
                        showVoting
                        pointAccount={pointAccount}
                        canAnswerQuestions={canManageThinkTankRole(user?.role)}
                        onVote={handleVote}
                        onVoteWithPoints={handleVoteWithPoints}
                        onAskQuestion={handleAskQuestion}
                        onAnswerQuestion={handleAnswerQuestion}
                    />
                </div>
            );
        }

        if (mode === 'my-ideas') {
            return (
                <div className="space-y-12 animate-tt-fade-up">
                    <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
                        <div className="space-y-8">
                            <GovernanceBanner governance={governance} />
                            
                            <div className="border-4 border-slate-950 bg-white p-8 relative overflow-hidden">
                                <IdeaSubmissionForm
                                    user={user}
                                    categories={CATEGORIES}
                                    governance={governance}
                                    refresh={refresh}
                                />
                            </div>
                        </div>

                        <div className="space-y-8">
                            <ThinkTankLeaderboard />
                            {ideas.length > 0 && (
                                <AIInsightsPanel ideaId={selectedIdea?.id || ideas[0].id} />
                            )}
                        </div>
                    </div>

                    <IdeaGrid
                        title="Submission History"
                        ideas={ideas}
                        showDuplicates
                        canAnswerQuestions={canManageThinkTankRole(user?.role)}
                        onAskQuestion={handleAskQuestion}
                        onAnswerQuestion={handleAnswerQuestion}
                    />
                </div>
            );
        }

        if (mode === 'vote') {
            return (
                <div className="space-y-6">
                    <GovernanceBanner governance={governance} />
                    {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
                    {pointAccount ? <PointAccountCard pointAccount={pointAccount} compact /> : null}
                    {selectedIdea ? (
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={() => router.push('/dashboard/think-tank/vote')}
                                    className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200"
                                >
                                    Back to ideas list
                                </button>
                                <div className="text-sm text-slate-500">
                                    Dedicated voting page for one idea with anonymous Q&amp;A and point allocation.
                                </div>
                            </div>
                            <IdeaGrid
                                title="Vote on This Idea"
                                ideas={[selectedIdea]}
                                showVoting
                                pointAccount={pointAccount}
                                canAnswerQuestions={canManageThinkTankRole(user?.role)}
                                onVote={handleVote}
                                onVoteWithPoints={handleVoteWithPoints}
                                onAskQuestion={handleAskQuestion}
                                onAnswerQuestion={handleAnswerQuestion}
                                onDeleteIdea={user?.role === 'SUPER_ADMIN' ? handleDeleteIdea : undefined}
                                singleIdeaView
                            />
                        </div>
                    ) : (
                        <IdeaGrid
                            title="Ideas for Vote"
                            ideas={ideas}
                            pointAccount={pointAccount}
                            onDeleteIdea={user?.role === 'SUPER_ADMIN' ? handleDeleteIdea : undefined}
                            singleIdeaLinks
                        />
                    )}
                </div>
            );
        }

        return (
            <div className="space-y-6">
                <GovernanceBanner governance={governance} />
                
                {governance?.nextRevealAt && (
                    <CountdownTimer targetDate={governance.nextRevealAt} />
                )}

                <IdeaGrid
                    title={
                        user?.role === 'SUPER_ADMIN' && governance?.mode !== 'REVEAL_READY' 
                            ? "Ideas Result (Live Preview)" 
                            : "Ideas Result"
                    }
                    ideas={results}
                    revealTeams
                    canAnswerQuestions={canManageThinkTankRole(user?.role)}
                    onAnswerQuestion={handleAnswerQuestion}
                />
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#FDFDFD] text-slate-950 font-sans selection:bg-[#FF4500] selection:text-white pb-20">
            <style dangerouslySetInnerHTML={{ __html: TT_ANIMATIONS }} />
            
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                {/* Bauhaus Navigation Header */}
                <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b-2 border-slate-950 py-6 mb-12 flex flex-wrap items-end justify-between gap-6">
                    <div className="group cursor-default">
                        <div className="text-[10px] font-black uppercase tracking-[0.5em] text-[#FF4500] mb-2 group-hover:tracking-[0.7em] transition-all">Innovation Unit</div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none uppercase">Think Tank</h1>
                    </div>
                    
                    <nav className="flex flex-wrap gap-1 bg-slate-950 p-1">
                        {[
                            { id: 'dashboard', path: '/dashboard/think-tank', label: 'Overview' },
                            { id: 'my-ideas', path: '/dashboard/think-tank/my-ideas', label: 'My Submissions' },
                            { id: 'vote', path: '/dashboard/think-tank/vote', label: 'Live Cycle' },
                            { id: 'results', path: '/dashboard/think-tank/results', label: 'Standings' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => router.push(tab.path)}
                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                                    mode === tab.id ? 'bg-[#FF4500] text-white' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </header>

                <main className="mt-8">
                    {error && (
                        <div className="mb-8 border-l-4 border-[#FF4500] bg-white p-4 shadow-sm animate-tt-fade-up">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#FF4500]">System Warning</p>
                            <p className="mt-1 text-sm font-bold text-slate-900">{error}</p>
                        </div>
                    )}
                    
                    {content()}
                </main>
            </div>
        </div>
    );
}

function NavChip({ href, label, active }: { href: string; label: string; active?: boolean }) {
    return (
        <Link
            href={href}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 shadow-sm ring-1 ring-slate-200'}`}
        >
            {label}
        </Link>
    );
}

function canManageThinkTankRole(role?: string | null) {
    return ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(role || '');
}

function SummaryCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm text-slate-500">{label}</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">{value}</div>
        </div>
    );
}

function PointAccountCard({
    pointAccount,
    compact,
}: {
    pointAccount: { basePoints: number; maxPerIdeaPoints: number; allocatedPoints: number; remainingPoints: number };
    compact?: boolean;
}) {
    return (
        <div className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${compact ? 'p-5' : 'p-6'}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="text-sm font-semibold text-slate-900">My Phase 3 Voting Points</div>
                    <div className="mt-1 text-sm text-slate-600">You can spend up to {pointAccount.maxPerIdeaPoints} points on a single idea in this cycle.</div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    Remaining <span className="font-semibold text-slate-950">{pointAccount.remainingPoints}</span> / {pointAccount.basePoints}
                </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
                <MiniMetric label="Base Points" value={pointAccount.basePoints} />
                <MiniMetric label="Allocated" value={pointAccount.allocatedPoints} />
                <MiniMetric label="Max Per Idea" value={pointAccount.maxPerIdeaPoints} />
            </div>
        </div>
    );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</div>
            <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
        </div>
    );
}

function QuickCard({ href, title, description }: { href: string; title: string; description: string }) {
    return (
        <Link href={href} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="mt-2 text-sm text-slate-600">{description}</p>
        </Link>
    );
}

function GovernanceBanner({ governance }: { governance: any }) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">Governance Window</div>
            <div className="mt-2 text-sm text-slate-600">{governance?.label || 'Loading governance state…'}</div>
            {governance?.overrideActive ? (
                <div className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                    Manual override active: {governance.mode}
                    {governance.overrideReason ? ` • ${governance.overrideReason}` : ''}
                </div>
            ) : null}
            <div className="mt-1 text-xs text-slate-500">Submission: 9:30 AM to 1:00 PM IST. Voting: before 9:30 AM, 1:00 PM to 3:00 PM, and after 5:00 PM IST. Locked review window: 3:00 PM to 5:00 PM IST. Reveal: 1st and 3rd Saturday at 3:00 PM IST.</div>
        </div>
    );
}

function GuidelinesGate({
    config,
    onAcknowledge,
}: {
    config: { title: string; items: string[]; acknowledgement: string };
    onAcknowledge: () => void;
}) {
    const [checked, setChecked] = useState(false);

    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Guidelines</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">{config.title}</h2>
                <p className="mt-2 text-sm text-slate-600">Please review and acknowledge these rules before you continue.</p>
            </div>
            <div className="mt-5 grid gap-3">
                {config.items.map((item) => (
                    <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        {item}
                    </div>
                ))}
            </div>
            <label className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-200 px-4 py-4 text-sm text-slate-700">
                <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                    checked={checked}
                    onChange={(event) => setChecked(event.target.checked)}
                />
                <span>{config.acknowledgement}</span>
            </label>
            <div className="mt-5 flex justify-end">
                <button
                    type="button"
                    disabled={!checked}
                    onClick={onAcknowledge}
                    className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                    Acknowledge and Continue
                </button>
            </div>
        </div>
    );
}

function GovernanceControlPanel({
    overrideForm,
    setOverrideForm,
    governance,
    updatingGovernance,
    onSubmit,
}: {
    overrideForm: { mode: string; reason: string };
    setOverrideForm: Dispatch<SetStateAction<{ mode: string; reason: string }>>;
    governance: any;
    updatingGovernance: boolean;
    onSubmit: (event: FormEvent) => void;
}) {
    return (
        <form onSubmit={onSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Super Admin Governance Override</h2>
                    <p className="mt-1 text-sm text-slate-600">Manually override the Think Tank submission and voting window for this company.</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Current mode: <span className="font-semibold text-slate-900">{governance?.mode || 'SCHEDULED'}</span>
                </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr_auto] md:items-end">
                <label className="grid gap-2 text-sm text-slate-700">
                    <span className="font-medium">Override mode</span>
                    <select
                        className="rounded-2xl border border-slate-200 px-4 py-3"
                        value={overrideForm.mode}
                        onChange={(event) => setOverrideForm((current) => ({ ...current, mode: event.target.value }))}
                    >
                        <option value="SCHEDULED">Scheduled</option>
                        <option value="SUBMISSIONS_OPEN">Submissions Open</option>
                        <option value="VOTING_OPEN">Voting Open</option>
                        <option value="LOCKED">Locked</option>
                        <option value="REVEAL_READY">Reveal Ready</option>
                    </select>
                </label>
                <label className="grid gap-2 text-sm text-slate-700">
                    <span className="font-medium">Reason</span>
                    <input
                        className="rounded-2xl border border-slate-200 px-4 py-3"
                        placeholder="Optional note for the override"
                        value={overrideForm.reason}
                        onChange={(event) => setOverrideForm((current) => ({ ...current, reason: event.target.value }))}
                    />
                </label>
                <button
                    type="submit"
                    disabled={updatingGovernance}
                    className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                    {updatingGovernance ? 'Saving…' : 'Apply Override'}
                </button>
            </div>
        </form>
    );
}

function ReviewBoard({
    ideas,
    assignees,
    canVeto,
    onReviewUpdate,
    onAddComment,
    onSaveReviewerScore,
    onVetoIdea,
    onConvertIdea,
}: {
    ideas: Idea[];
    assignees: Array<{ id: string; name?: string | null; email?: string | null; designation?: string | null }>;
    canVeto?: boolean;
    onReviewUpdate: (ideaId: string, payload: { reviewStage?: string; implementationStatus?: string; decisionNotes?: string }) => Promise<void>;
    onAddComment: (ideaId: string, content: string) => Promise<void>;
    onSaveReviewerScore: (ideaId: string, payload: {
        impactScore: number;
        feasibilityScore: number;
        costScore: number;
        speedScore: number;
        strategicFitScore: number;
        scalabilityScore: number;
        note?: string;
    }) => Promise<void>;
    onVetoIdea: (ideaId: string, reason: string) => Promise<void>;
    onConvertIdea: (ideaId: string, payload: {
        mode: 'PROJECT' | 'TASK';
        ownerUserId?: string;
        memberIds?: string[];
        title?: string;
        description?: string;
        priority?: string;
        startDate?: string;
        endDate?: string;
        dueDate?: string;
    }) => Promise<void>;
}) {
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [comments, setComments] = useState<Record<string, string>>({});
    const [scoreNotes, setScoreNotes] = useState<Record<string, string>>({});
    const [scoreForms, setScoreForms] = useState<Record<string, Record<string, number>>>({});
    const [vetoReasons, setVetoReasons] = useState<Record<string, string>>({});
    const [convertingIdeaId, setConvertingIdeaId] = useState<string | null>(null);
    const [conversionForms, setConversionForms] = useState<Record<string, {
        mode: 'PROJECT' | 'TASK';
        ownerUserId: string;
        memberIds: string;
        title: string;
        description: string;
        priority: string;
        startDate: string;
        endDate: string;
        dueDate: string;
    }>>({});

    const getConversionForm = (idea: Idea) => {
        return conversionForms[idea.id] || {
            mode: 'PROJECT',
            ownerUserId: '',
            memberIds: '',
            title: '',
            description: '',
            priority: 'MEDIUM',
            startDate: '',
            endDate: '',
            dueDate: '',
        };
    };

    const getScoreForm = (idea: Idea) => {
        const existing = idea.reviewerScores?.[0];
        return scoreForms[idea.id] || {
            impactScore: existing?.impactScore || 0,
            feasibilityScore: existing?.feasibilityScore || 0,
            costScore: existing?.costScore || 0,
            speedScore: existing?.speedScore || 0,
            strategicFitScore: existing?.strategicFitScore || 0,
            scalabilityScore: existing?.scalabilityScore || 0,
        };
    };

    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
                <h2 className="text-lg font-semibold text-slate-900">Review Board</h2>
                <p className="mt-1 text-sm text-slate-600">Shortlist, approve, and track implementation progress with structured reviewer notes.</p>
            </div>
            <div className="space-y-4">
                {ideas.slice(0, 8).map((idea) => (
                    <div key={idea.id} className="rounded-3xl border border-slate-200 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">{formatThinkTankLabel(idea.category)}</div>
                                <h3 className="mt-2 text-lg font-semibold text-slate-950">{idea.topic}</h3>
                                <p className="mt-2 text-sm text-slate-600">{idea.description}</p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                <div>Community: <span className="font-semibold text-slate-900">{idea.communityScore ?? idea.weightedScore}</span></div>
                                <div>Reviewer: <span className="font-semibold text-slate-900">{idea.reviewerScore ?? 0}</span></div>
                                <div>Final: <span className="font-semibold text-slate-900">{idea.finalScore ?? idea.weightedScore}</span></div>
                                <div>Votes: <span className="font-semibold text-slate-900">{idea.voteCount}</span></div>
                            </div>
                        </div>
                        {idea.isVetoed ? (
                            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                                <div className="font-semibold">Super Admin veto applied</div>
                                <div className="mt-1">{idea.vetoReason || 'No reason recorded.'}</div>
                                <div className="mt-1 text-rose-700">Vetoed on {formatDateTime(idea.vetoedAt || null)}</div>
                            </div>
                        ) : null}
                        <div className="mt-4 grid gap-3 md:grid-cols-[200px_220px_1fr_auto] md:items-end">
                            <label className="grid gap-2 text-sm text-slate-700">
                                <span className="font-medium">Review stage</span>
                                <select
                                    className="rounded-2xl border border-slate-200 px-4 py-3"
                                    defaultValue={idea.reviewStage || 'SUBMITTED'}
                                    onChange={(event) => onReviewUpdate(idea.id, { reviewStage: event.target.value })}
                                >
                                    <option value="SUBMITTED">Submitted</option>
                                    <option value="SHORTLISTED">Shortlisted</option>
                                    <option value="UNDER_REVIEW">Under Review</option>
                                    <option value="APPROVED">Approved</option>
                                    <option value="REJECTED">Rejected</option>
                                    <option value="IMPLEMENTED">Implemented</option>
                                </select>
                            </label>
                            <label className="grid gap-2 text-sm text-slate-700">
                                <span className="font-medium">Implementation</span>
                                <select
                                    className="rounded-2xl border border-slate-200 px-4 py-3"
                                    defaultValue={idea.implementationStatus || 'NOT_STARTED'}
                                    onChange={(event) => onReviewUpdate(idea.id, { implementationStatus: event.target.value })}
                                >
                                    <option value="NOT_STARTED">Not Started</option>
                                    <option value="PLANNED">Planned</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="BLOCKED">Blocked</option>
                                    <option value="COMPLETED">Completed</option>
                                </select>
                            </label>
                            <label className="grid gap-2 text-sm text-slate-700">
                                <span className="font-medium">Decision notes</span>
                                <input
                                    className="rounded-2xl border border-slate-200 px-4 py-3"
                                    placeholder="Why this idea was shortlisted, approved, or blocked"
                                    value={notes[idea.id] ?? idea.decisionNotes ?? ''}
                                    onChange={(event) => setNotes((current) => ({ ...current, [idea.id]: event.target.value }))}
                                />
                            </label>
                            <button
                                onClick={() => onReviewUpdate(idea.id, { decisionNotes: notes[idea.id] ?? idea.decisionNotes ?? '' })}
                                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
                            >
                                Save Notes
                            </button>
                        </div>
                        {idea.executionLink ? (
                            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                                <div className="font-semibold">Execution linked</div>
                                <div className="mt-1">
                                    This idea is already linked to a {idea.executionLink.type.toLowerCase()}: <span className="font-semibold">{idea.executionLink.title}</span>
                                </div>
                                <div className="mt-1 text-emerald-700">Converted on {formatDateTime(idea.executionLink.convertedAt || null)}</div>
                            </div>
                        ) : null}
                        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                            <div className="text-sm font-semibold text-slate-900">Reviewer comments</div>
                            <div className="mt-3 space-y-3">
                                {(idea.comments || []).slice(0, 4).map((comment) => (
                                    <div key={comment.id} className="rounded-2xl bg-white p-3 text-sm text-slate-700">
                                        <div className="font-medium text-slate-900">{comment.author?.name || comment.author?.email || 'Reviewer'}</div>
                                        <div className="mt-1 whitespace-pre-wrap">{comment.content}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 flex gap-3">
                                <input
                                    className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                                    placeholder="Add reviewer comment"
                                    value={comments[idea.id] || ''}
                                    onChange={(event) => setComments((current) => ({ ...current, [idea.id]: event.target.value }))}
                                />
                                <button
                                    onClick={async () => {
                                        const content = comments[idea.id]?.trim();
                                        if (!content) return;
                                        await onAddComment(idea.id, content);
                                        setComments((current) => ({ ...current, [idea.id]: '' }));
                                    }}
                                    className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white"
                                >
                                    Add Comment
                                </button>
                            </div>
                        </div>
                        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                            <div className="text-sm font-semibold text-slate-900">Reviewer rubric</div>
                            <div className="mt-3 grid gap-3 md:grid-cols-3">
                                {REVIEW_SCORE_FIELDS.map((field) => (
                                    <label key={field.key} className="grid gap-2 text-sm text-slate-700">
                                        <span className="font-medium">{field.label}</span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={10}
                                            className="rounded-2xl border border-slate-200 px-4 py-3"
                                            value={getScoreForm(idea)[field.key]}
                                            onChange={(event) => setScoreForms((current) => ({
                                                ...current,
                                                [idea.id]: {
                                                    ...getScoreForm(idea),
                                                    [field.key]: Number(event.target.value),
                                                },
                                            }))}
                                        />
                                    </label>
                                ))}
                                <label className="grid gap-2 text-sm text-slate-700 md:col-span-3">
                                    <span className="font-medium">Reviewer note</span>
                                    <textarea
                                        className="min-h-24 rounded-2xl border border-slate-200 px-4 py-3"
                                        placeholder="Why this idea scores well or needs more work"
                                        value={scoreNotes[idea.id] ?? idea.reviewerScores?.[0]?.note ?? ''}
                                        onChange={(event) => setScoreNotes((current) => ({ ...current, [idea.id]: event.target.value }))}
                                    />
                                </label>
                            </div>
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                <div className="text-sm text-slate-600">
                                    Latest rubric total: <span className="font-semibold text-slate-900">{idea.reviewerScores?.[0]?.totalScore ?? 0}</span>
                                </div>
                                <button
                                    onClick={() => onSaveReviewerScore(idea.id, {
                                        ...(getScoreForm(idea) as any),
                                        note: scoreNotes[idea.id] ?? idea.reviewerScores?.[0]?.note ?? '',
                                    })}
                                    className="rounded-2xl bg-indigo-700 px-4 py-3 text-sm font-semibold text-white"
                                >
                                    Save Reviewer Score
                                </button>
                            </div>
                        </div>
                        {canVeto && !idea.isVetoed ? (
                            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                                <div className="text-sm font-semibold text-rose-900">Super Admin veto</div>
                                <div className="mt-1 text-sm text-rose-800">Use veto only when an idea must be blocked for this cycle regardless of voting or reviewer score.</div>
                                <div className="mt-3 flex gap-3">
                                    <input
                                        className="flex-1 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm"
                                        placeholder="Required veto reason"
                                        value={vetoReasons[idea.id] || ''}
                                        onChange={(event) => setVetoReasons((current) => ({ ...current, [idea.id]: event.target.value }))}
                                    />
                                    <button
                                        onClick={() => onVetoIdea(idea.id, vetoReasons[idea.id] || '')}
                                        className="rounded-2xl bg-rose-700 px-4 py-3 text-sm font-semibold text-white"
                                    >
                                        Apply Veto
                                    </button>
                                </div>
                            </div>
                        ) : null}
                        {['APPROVED', 'IMPLEMENTED'].includes(idea.reviewStage || '') && !idea.executionLink ? (
                            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-semibold text-slate-900">Convert to project or task</div>
                                        <p className="mt-1 text-sm text-slate-600">Move this approved idea into tracked execution without leaving the Think Tank review board.</p>
                                    </div>
                                </div>
                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                    <label className="grid gap-2 text-sm text-slate-700">
                                        <span className="font-medium">Execution type</span>
                                        <select
                                            className="rounded-2xl border border-slate-200 px-4 py-3"
                                            value={getConversionForm(idea).mode}
                                            onChange={(event) => setConversionForms((current) => ({
                                                ...current,
                                                [idea.id]: { ...getConversionForm(idea), mode: event.target.value as 'PROJECT' | 'TASK' },
                                            }))}
                                        >
                                            <option value="PROJECT">Project</option>
                                            <option value="TASK">Task</option>
                                        </select>
                                    </label>
                                    <label className="grid gap-2 text-sm text-slate-700">
                                        <span className="font-medium">Owner</span>
                                        <select
                                            className="rounded-2xl border border-slate-200 px-4 py-3"
                                            value={getConversionForm(idea).ownerUserId}
                                            onChange={(event) => setConversionForms((current) => ({
                                                ...current,
                                                [idea.id]: { ...getConversionForm(idea), ownerUserId: event.target.value },
                                            }))}
                                        >
                                            <option value="">Assign to current reviewer</option>
                                            {assignees.map((assignee) => (
                                                <option key={assignee.id} value={assignee.id}>
                                                    {(assignee.name || assignee.email || assignee.id)}{assignee.designation ? ` • ${assignee.designation}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="grid gap-2 text-sm text-slate-700">
                                        <span className="font-medium">Execution title</span>
                                        <input
                                            className="rounded-2xl border border-slate-200 px-4 py-3"
                                            placeholder={idea.topic}
                                            value={getConversionForm(idea).title}
                                            onChange={(event) => setConversionForms((current) => ({
                                                ...current,
                                                [idea.id]: { ...getConversionForm(idea), title: event.target.value },
                                            }))}
                                        />
                                    </label>
                                    <label className="grid gap-2 text-sm text-slate-700">
                                        <span className="font-medium">Priority</span>
                                        <select
                                            className="rounded-2xl border border-slate-200 px-4 py-3"
                                            value={getConversionForm(idea).priority}
                                            onChange={(event) => setConversionForms((current) => ({
                                                ...current,
                                                [idea.id]: { ...getConversionForm(idea), priority: event.target.value },
                                            }))}
                                        >
                                            <option value="LOW">Low</option>
                                            <option value="MEDIUM">Medium</option>
                                            <option value="HIGH">High</option>
                                            <option value="URGENT">Urgent</option>
                                        </select>
                                    </label>
                                    <label className="grid gap-2 text-sm text-slate-700 md:col-span-2">
                                        <span className="font-medium">Execution description override</span>
                                        <textarea
                                            className="min-h-28 rounded-2xl border border-slate-200 px-4 py-3"
                                            placeholder="Leave blank to use the original idea description."
                                            value={getConversionForm(idea).description}
                                            onChange={(event) => setConversionForms((current) => ({
                                                ...current,
                                                [idea.id]: { ...getConversionForm(idea), description: event.target.value },
                                            }))}
                                        />
                                    </label>
                                    {getConversionForm(idea).mode === 'PROJECT' ? (
                                        <>
                                            <label className="grid gap-2 text-sm text-slate-700">
                                                <span className="font-medium">Start date</span>
                                                <input
                                                    type="date"
                                                    className="rounded-2xl border border-slate-200 px-4 py-3"
                                                    value={getConversionForm(idea).startDate}
                                                    onChange={(event) => setConversionForms((current) => ({
                                                        ...current,
                                                        [idea.id]: { ...getConversionForm(idea), startDate: event.target.value },
                                                    }))}
                                                />
                                            </label>
                                            <label className="grid gap-2 text-sm text-slate-700">
                                                <span className="font-medium">End date</span>
                                                <input
                                                    type="date"
                                                    className="rounded-2xl border border-slate-200 px-4 py-3"
                                                    value={getConversionForm(idea).endDate}
                                                    onChange={(event) => setConversionForms((current) => ({
                                                        ...current,
                                                        [idea.id]: { ...getConversionForm(idea), endDate: event.target.value },
                                                    }))}
                                                />
                                            </label>
                                            <label className="grid gap-2 text-sm text-slate-700 md:col-span-2">
                                                <span className="font-medium">Additional member user IDs</span>
                                                <input
                                                    className="rounded-2xl border border-slate-200 px-4 py-3"
                                                    placeholder="Comma-separated user IDs to add as project members"
                                                    value={getConversionForm(idea).memberIds}
                                                    onChange={(event) => setConversionForms((current) => ({
                                                        ...current,
                                                        [idea.id]: { ...getConversionForm(idea), memberIds: event.target.value },
                                                    }))}
                                                />
                                            </label>
                                        </>
                                    ) : (
                                        <label className="grid gap-2 text-sm text-slate-700 md:col-span-2">
                                            <span className="font-medium">Due date</span>
                                            <input
                                                type="date"
                                                className="rounded-2xl border border-slate-200 px-4 py-3"
                                                value={getConversionForm(idea).dueDate}
                                                onChange={(event) => setConversionForms((current) => ({
                                                    ...current,
                                                    [idea.id]: { ...getConversionForm(idea), dueDate: event.target.value },
                                                }))}
                                            />
                                        </label>
                                    )}
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <button
                                        onClick={async () => {
                                            const form = getConversionForm(idea);
                                            setConvertingIdeaId(idea.id);
                                            try {
                                                await onConvertIdea(idea.id, {
                                                    mode: form.mode,
                                                    ownerUserId: form.ownerUserId || undefined,
                                                    memberIds: form.memberIds.split(',').map((value) => value.trim()).filter(Boolean),
                                                    title: form.title || undefined,
                                                    description: form.description || undefined,
                                                    priority: form.priority || undefined,
                                                    startDate: form.startDate || undefined,
                                                    endDate: form.endDate || undefined,
                                                    dueDate: form.dueDate || undefined,
                                                });
                                            } finally {
                                                setConvertingIdeaId(null);
                                            }
                                        }}
                                        disabled={convertingIdeaId === idea.id}
                                        className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                                    >
                                        {convertingIdeaId === idea.id ? 'Converting…' : `Convert to ${getConversionForm(idea).mode === 'PROJECT' ? 'Project' : 'Task'}`}
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                ))}
            </div>
        </div>
    );
}

function ThinkTankAnalytics({ analytics }: { analytics: any }) {
    const entries = (record: Record<string, number>) => Object.entries(record || {});

    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
                <h2 className="text-lg font-semibold text-slate-900">Think Tank Analytics</h2>
                <p className="mt-1 text-sm text-slate-600">Participation, review progress, and implementation movement across recent cycles.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
                <SummaryCard label="Total Ideas" value={analytics.totals?.ideas || 0} />
                <SummaryCard label="Total Votes" value={analytics.totals?.votes || 0} />
                <SummaryCard label="Shortlisted" value={analytics.totals?.shortlisted || 0} />
                <SummaryCard label="Implemented" value={analytics.totals?.implemented || 0} />
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <MetricList title="Ideas by Category" items={entries(analytics.ideasByCategory)} />
                <MetricList title="Ideas by Stage" items={entries(analytics.ideasByStage)} />
                <MetricList title="Implementation Status" items={entries(analytics.implementationByStatus)} />
                <MetricList
                    title="Top Ideas"
                    items={(analytics.topIdeas || []).map((idea: any) => [idea.topic, idea.weightedScore] as [string, number])}
                />
            </div>
        </div>
    );
}

function MetricList({ title, items }: { title: string; items: Array<[string, number]> }) {
    return (
        <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <div className="mt-3 space-y-2">
                {items.length > 0 ? items.map(([label, value], index) => (
                    <div key={`${label}-${value}-${index}`} className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 text-sm text-slate-700">
                        <span>{formatThinkTankLabel(label, 'Unspecified')}</span>
                        <span className="font-semibold text-slate-900">{value}</span>
                    </div>
                )) : <div className="text-sm text-slate-500">No data yet.</div>}
            </div>
        </div>
    );
}

function IdeaGrid({
    title,
    ideas,
    showVoting,
    showDuplicates,
    revealTeams,
    pointAccount,
    canAnswerQuestions,
    singleIdeaLinks,
    singleIdeaView,
    onVote,
    onVoteWithPoints,
    onAskQuestion,
    onAnswerQuestion,
    onDeleteIdea,
}: {
    title: string;
    ideas: Idea[];
    showVoting?: boolean;
    showDuplicates?: boolean;
    revealTeams?: boolean;
    pointAccount?: { basePoints: number; maxPerIdeaPoints: number; allocatedPoints: number; remainingPoints: number } | null;
    canAnswerQuestions?: boolean;
    singleIdeaLinks?: boolean;
    singleIdeaView?: boolean;
    onVote?: (ideaId: string, vote: 'LIKE' | 'UNLIKE' | 'NEUTRAL') => void;
    onVoteWithPoints?: (ideaId: string, vote: 'LIKE' | 'UNLIKE' | 'NEUTRAL', pointAllocation: number) => void;
    onAskQuestion?: (ideaId: string, question: string) => Promise<void>;
    onAnswerQuestion?: (questionId: string, answer: string) => Promise<void>;
    onDeleteIdea?: (ideaId: string) => Promise<void>;
}) {
    const [pointInputs, setPointInputs] = useState<Record<string, number>>({});
    const [questionInputs, setQuestionInputs] = useState<Record<string, string>>({});
    const [answerInputs, setAnswerInputs] = useState<Record<string, string>>({});

    if (!ideas.length) {
        return <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-sm text-slate-500">No ideas found in this view yet.</div>;
    }

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
            <div className="grid gap-4">
                {ideas.map((idea) => (
                    <div key={idea.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">{formatThinkTankLabel(idea.category)}</div>
                                <h3 className="mt-2 text-xl font-semibold text-slate-950">{idea.topic}</h3>
                                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{idea.description}</p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right text-sm text-slate-600">
                                <div>Status: <span className="font-semibold text-slate-900">{idea.status}</span></div>
                                <div>Votes: <span className="font-semibold text-slate-900">{idea.voteCount}</span></div>
                                <div>Community Score: <span className="font-semibold text-slate-900">{idea.communityScore ?? idea.weightedScore}</span></div>
                                <div>Reviewer Score: <span className="font-semibold text-slate-900">{idea.reviewerScore ?? 0}</span></div>
                                <div>Final Score: <span className="font-semibold text-slate-900">{idea.finalScore ?? idea.weightedScore}</span></div>
                            </div>
                        </div>
                        {idea.isVetoed ? (
                            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                                <div className="font-semibold">This idea has been vetoed for the current cycle.</div>
                                <div className="mt-1">{idea.vetoReason || 'No veto reason recorded.'}</div>
                            </div>
                        ) : null}
                        <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                            <span>Created {formatDateTime(idea.createdAt)}</span>
                            {idea.revealedAt ? <span>Revealed {formatDateTime(idea.revealedAt)}</span> : null}
                            {typeof idea.questionCount === 'number' ? <span>{idea.questionCount} questions</span> : null}
                        </div>
                        {singleIdeaLinks ? (
                            <div className="mt-4">
                                <Link
                                    href={`/dashboard/think-tank/vote/${idea.id}`}
                                    className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                                >
                                    Open idea details
                                </Link>
                            </div>
                        ) : null}
                        {onDeleteIdea ? (
                            <div className="mt-4">
                                <button
                                    onClick={() => onDeleteIdea(idea.id)}
                                    className="inline-flex rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-200"
                                >
                                    Delete Idea (Super Admin)
                                </button>
                            </div>
                        ) : null}
                        {idea.attachments && idea.attachments.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {idea.attachments.map((attachment) => (
                                    <a key={attachment.id} href={attachment.url} target="_blank" className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700" rel="noreferrer">
                                        {attachment.filename}
                                    </a>
                                ))}
                            </div>
                        )}
                        {idea.reviewStage || idea.implementationStatus ? (
                            <div className="mt-4 flex flex-wrap gap-2 text-xs">
                                {idea.reviewStage ? <span className="rounded-full bg-indigo-100 px-3 py-1 font-semibold text-indigo-700">Stage: {idea.reviewStage}</span> : null}
                                {idea.implementationStatus ? <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700">Implementation: {idea.implementationStatus}</span> : null}
                            </div>
                        ) : null}
                        {idea.decisionNotes ? (
                            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                                <div className="font-semibold text-slate-900">Decision Notes</div>
                                <div className="mt-2 whitespace-pre-wrap">{idea.decisionNotes}</div>
                            </div>
                        ) : null}
                        {idea.comments && idea.comments.length > 0 ? (
                            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                                <div className="text-sm font-semibold text-slate-900">Review Notes</div>
                                <div className="mt-3 space-y-3">
                                    {idea.comments.slice(0, 3).map((comment) => (
                                        <div key={comment.id} className="rounded-2xl bg-white p-3 text-sm text-slate-700">
                                            <div className="font-medium text-slate-900">{comment.author?.name || comment.author?.email || 'Reviewer'}</div>
                                            <div className="mt-1 whitespace-pre-wrap">{comment.content}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                        {showVoting && onVote && (
                            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-semibold text-slate-900">Phase 3 point vote</div>
                                        <div className="mt-1 text-sm text-slate-600">
                                            {idea.currentVote
                                                ? 'You have already voted on this idea. Use edit controls below to update your points or change your vote.'
                                                : 'Choose your vote and allocate points from your cycle budget.'}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        {idea.currentVote ? (
                                            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
                                                Current vote: <span className="font-semibold">{formatThinkTankLabel(idea.currentVote.vote, 'Vote')}</span>
                                                <span className="mx-2 text-indigo-300">•</span>
                                                {idea.currentVote.pointAllocation} points
                                            </div>
                                        ) : null}
                                        {pointAccount ? (
                                            <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">
                                                Remaining {pointAccount.remainingPoints} / {pointAccount.basePoints}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                                <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr] md:items-end">
                                    <label className="grid gap-2 text-sm text-slate-700">
                                        <span className="font-medium">Points for this idea</span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={pointAccount?.maxPerIdeaPoints || 0}
                                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                                            value={pointInputs[idea.id] ?? idea.currentVote?.pointAllocation ?? pointAccount?.maxPerIdeaPoints ?? 0}
                                            onChange={(event) => setPointInputs((current) => ({ ...current, [idea.id]: Number(event.target.value) }))}
                                        />
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => (onVoteWithPoints || ((targetId: string, targetVote: 'LIKE' | 'UNLIKE' | 'NEUTRAL', _points: number) => onVote(targetId, targetVote)))(idea.id, 'LIKE', pointInputs[idea.id] ?? pointAccount?.maxPerIdeaPoints ?? 0)}
                                            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                                        >
                                            {idea.currentVote?.vote === 'LIKE' ? 'Update Support' : 'Support'}
                                        </button>
                                        <button
                                            onClick={() => (onVoteWithPoints || ((targetId: string, targetVote: 'LIKE' | 'UNLIKE' | 'NEUTRAL', _points: number) => onVote(targetId, targetVote)))(idea.id, 'NEUTRAL', pointInputs[idea.id] ?? pointAccount?.maxPerIdeaPoints ?? 0)}
                                            className="rounded-full bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                                        >
                                            {idea.currentVote?.vote === 'NEUTRAL' ? 'Update Neutral' : 'Neutral'}
                                        </button>
                                        <button
                                            onClick={() => (onVoteWithPoints || ((targetId: string, targetVote: 'LIKE' | 'UNLIKE' | 'NEUTRAL', _points: number) => onVote(targetId, targetVote)))(idea.id, 'UNLIKE', pointInputs[idea.id] ?? pointAccount?.maxPerIdeaPoints ?? 0)}
                                            className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
                                        >
                                            {idea.currentVote?.vote === 'UNLIKE' ? 'Update Oppose' : 'Oppose'}
                                        </button>
                                    </div>
                                </div>
                                {idea.currentVote ? (
                                    <div className="mt-3 text-xs text-slate-500">
                                        Last updated {formatDateTime(idea.currentVote.updatedAt)}. Each user can vote only once per idea, but can edit that vote and reallocate points.
                                    </div>
                                ) : (
                                    <div className="mt-3 text-xs text-slate-500">
                                        You can vote once per idea. After that, you can edit your existing vote and update your shared points.
                                    </div>
                                )}
                            </div>
                        )}
                        {((idea.questions && idea.questions.length > 0) || onAskQuestion) && (!singleIdeaLinks || singleIdeaView) ? (
                            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                                <div className="text-sm font-semibold text-slate-900">Idea Q&amp;A</div>
                                <div className="mt-3 space-y-3">
                                    {(idea.questions || []).map((question) => (
                                        <div key={question.id} className="rounded-2xl bg-white p-4 text-sm text-slate-700">
                                            <div className="font-medium text-slate-900">{question.askedByLabel || 'Anonymous Voter'} asked</div>
                                            <div className="mt-1 whitespace-pre-wrap">{question.question}</div>
                                            {question.answer ? (
                                                <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                                                    <div className="font-medium text-slate-900">{question.answeredByLabel || 'Anonymous Planner'} answered</div>
                                                    <div className="mt-1 whitespace-pre-wrap">{question.answer}</div>
                                                </div>
                                            ) : canAnswerQuestions && onAnswerQuestion ? (
                                                <div className="mt-3 flex gap-3">
                                                    <input
                                                        className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                                                        placeholder="Answer this question"
                                                        value={answerInputs[question.id] || ''}
                                                        onChange={(event) => setAnswerInputs((current) => ({ ...current, [question.id]: event.target.value }))}
                                                    />
                                                    <button
                                                        onClick={async () => {
                                                            const answer = answerInputs[question.id]?.trim();
                                                            if (!answer) return;
                                                            await onAnswerQuestion(question.id, answer);
                                                            setAnswerInputs((current) => ({ ...current, [question.id]: '' }));
                                                        }}
                                                        className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
                                                    >
                                                        Answer
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="mt-3 text-xs font-medium text-amber-700">Waiting for planner answer.</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {onAskQuestion ? (
                                    <div className="mt-4 flex gap-3">
                                        <input
                                            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                                            placeholder="Ask the planner a question about feasibility, rollout, or impact"
                                            value={questionInputs[idea.id] || ''}
                                            onChange={(event) => setQuestionInputs((current) => ({ ...current, [idea.id]: event.target.value }))}
                                        />
                                        <button
                                            onClick={async () => {
                                                const question = questionInputs[idea.id]?.trim();
                                                if (!question) return;
                                                await onAskQuestion(idea.id, question);
                                                setQuestionInputs((current) => ({ ...current, [idea.id]: '' }));
                                            }}
                                            className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white"
                                        >
                                            Ask
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                        {idea.reviewerScores && idea.reviewerScores.length > 0 ? (
                            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                                <div className="text-sm font-semibold text-slate-900">Reviewer Rubrics</div>
                                <div className="mt-3 space-y-3">
                                    {idea.reviewerScores.slice(0, 3).map((score) => (
                                        <div key={score.id} className="rounded-2xl bg-white p-3 text-sm text-slate-700">
                                            <div className="font-medium text-slate-900">{score.reviewer?.name || score.reviewer?.email || 'Reviewer'}</div>
                                            <div className="mt-1">Total rubric score: <span className="font-semibold">{score.totalScore}</span></div>
                                            {score.note ? <div className="mt-1 whitespace-pre-wrap">{score.note}</div> : null}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                        {showDuplicates && idea.duplicateMatches && idea.duplicateMatches.length > 0 && (
                            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                                <div className="font-semibold">Duplicate review trail</div>
                                <div className="mt-2 space-y-2">
                                    {idea.duplicateMatches.map((match) => (
                                        <div key={match.id} className="rounded-2xl bg-white p-3">
                                            <div className="font-medium">{match.matchedIdea.topic}</div>
                                            <div>Similarity {(match.similarityScore * 100).toFixed(1)}% • Decision {match.decision}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {revealTeams && (
                            <div className="mt-5 grid gap-4 md:grid-cols-3">
                                <TeamBlock title="Planner" people={idea.author ? [idea.author] : []} />
                                <TeamBlock title="Partners" people={(idea.partners || []).map((entry) => entry.user).filter(Boolean) as any[]} />
                                <TeamBlock title="Co-Opted Team" people={(idea.teamMembers || []).map((entry) => entry.user).filter(Boolean) as any[]} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function TeamBlock({ title, people }: { title: string; people: Array<{ id: string; name?: string | null; email?: string | null }> }) {
    return (
        <div className="rounded-2xl bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <div className="mt-2 space-y-2 text-sm text-slate-600">
                {people.length > 0 ? people.map((person) => (
                    <div key={person.id} className="rounded-2xl bg-white px-3 py-2">
                        <div className="font-medium text-slate-900">{person.name || person.email || 'Staff member'}</div>
                        <div className="text-xs text-slate-500">{person.email || person.id}</div>
                    </div>
                )) : <div>No members revealed.</div>}
            </div>
        </div>
    );
}

function CountdownTimer({ targetDate }: { targetDate: string }) {
    const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

    useEffect(() => {
        if (!targetDate) return;
        const target = new Date(targetDate).getTime();
        
        const update = () => {
            const now = new Date().getTime();
            const difference = target - now;
            
            if (difference <= 0) {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                return;
            }
            
            setTimeLeft({
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((difference % (1000 * 60)) / 1000),
            });
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [targetDate]);

    if (!timeLeft) return null;

    return (
        <div className="rounded-3xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm flex flex-col items-center justify-center text-center">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">Next Reveal In</h3>
            <div className="mt-4 flex items-center justify-center gap-4 text-indigo-900">
                <div className="flex flex-col items-center">
                    <div className="text-4xl font-bold font-mono">{String(timeLeft.days).padStart(2, '0')}</div>
                    <div className="text-xs uppercase tracking-wider text-indigo-500 mt-1">Days</div>
                </div>
                <div className="text-3xl font-light pb-4">:</div>
                <div className="flex flex-col items-center">
                    <div className="text-4xl font-bold font-mono">{String(timeLeft.hours).padStart(2, '0')}</div>
                    <div className="text-xs uppercase tracking-wider text-indigo-500 mt-1">Hours</div>
                </div>
                <div className="text-3xl font-light pb-4">:</div>
                <div className="flex flex-col items-center">
                    <div className="text-4xl font-bold font-mono">{String(timeLeft.minutes).padStart(2, '0')}</div>
                    <div className="text-xs uppercase tracking-wider text-indigo-500 mt-1">Mins</div>
                </div>
                <div className="text-3xl font-light pb-4">:</div>
                <div className="flex flex-col items-center">
                    <div className="text-4xl font-bold font-mono">{String(timeLeft.seconds).padStart(2, '0')}</div>
                    <div className="text-xs uppercase tracking-wider text-indigo-500 mt-1">Secs</div>
                </div>
            </div>
        </div>
    );
}
