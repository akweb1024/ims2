'use client';

import { useCallback, useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../DashboardLayout';
import ThinkTankLeaderboard from './ThinkTankLeaderboard';
import AIInsightsPanel from './AIInsightsPanel';
import IdeaSubmissionForm from './IdeaSubmissionForm';
import { showError, showInfo, showWarning } from '@/lib/toast';

// Animation and Design Tokens - Swiss-Bauhaus Remix
const TT_ANIMATIONS = `
@keyframes tt-fade-up {
  from { opacity: 0; transform: translateY(20px); filter: blur(5px); }
  to { opacity: 1; transform: translateY(0); filter: blur(0); }
}
`;

type PortalMode = 'dashboard' | 'my-ideas' | 'vote' | 'results' | 'customization';
type ThinkTankAcknowledgementKey = 'my-ideas' | 'vote' | 'results';
type ThinkTankWindowSettings = {
    resultSaturdays: number[];
    resultTime: string;
    ideaSubmissionDays: number;
    votingEndDay: number;
    votingEndTime: string;
};
type VoteMonitorAccount = {
    id: string;
    userId: string;
    basePoints: number;
    maxPerIdeaPoints: number;
    allocatedPoints: number;
    remainingPoints: number;
    updatedAt: string;
    user: {
        id: string;
        name?: string | null;
        email?: string | null;
        role?: string | null;
        designation?: string | null;
    };
    votes: Array<{
        id: string;
        vote: 'LIKE' | 'UNLIKE' | 'NEUTRAL';
        pointAllocation: number;
        weightedValue: number;
        updatedAt: string;
        idea: {
            id: string;
            topic: string;
            status: string;
        };
    }>;
};

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

const DEFAULT_WINDOW_SETTINGS: ThinkTankWindowSettings = {
    resultSaturdays: [2, 4],
    resultTime: '15:00',
    ideaSubmissionDays: 7,
    votingEndDay: 5,
    votingEndTime: '23:30',
};

const WEEKDAY_OPTIONS = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
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

const THINK_TANK_MODE_CONTENT: Record<PortalMode, {
    eyebrow: string;
    title: string;
    description: string;
    navLabel: string;
    helpTitle: string;
    helpSteps: string[];
    helpTips: string[];
}> = {
    dashboard: {
        eyebrow: 'Innovation Control Room',
        title: 'Think Tank Overview',
        description: 'Track the current cycle, see governance status, and monitor what needs attention across submission, review, voting, and results.',
        navLabel: 'Overview',
        helpTitle: 'How This Workspace Works',
        helpSteps: [
            'Check the governance banner first to know whether submissions, review, voting, or result announcement is active.',
            'Use the overview to monitor cycle momentum, top ideas, and review-board activity without switching between pages.',
            'If you manage Think Tank governance, review hidden ideas here before the voting window opens to employees.',
        ],
        helpTips: [
            'Use this page as the daily operating view for the current cycle.',
            'Super admins can hold ideas before they appear in the public voting list.',
        ],
    },
    'my-ideas': {
        eyebrow: 'Proposal Studio',
        title: 'Submit And Track Ideas',
        description: 'Draft proposals, attach supporting files, add collaborators, and follow the status of your own idea submissions.',
        navLabel: 'My Submissions',
        helpTitle: 'Submission Guide',
        helpSteps: [
            'Write one idea per submission with a clear topic, business problem, and solution direction.',
            'Choose the right category, then add up to three partners who will actually help drive the idea forward.',
            'If the system detects a duplicate, review the overlap and choose whether to merge or proceed as unique.',
        ],
        helpTips: [
            'Use attachments only after they are uploaded successfully.',
            'Submission history below the form shows what you have already shared in the current cycle.',
        ],
    },
    vote: {
        eyebrow: 'Voting Floor',
        title: 'Vote And Explore Ideas',
        description: 'Browse the voting list in a table, open a full idea page for detailed review, and allocate points carefully during the live cycle.',
        navLabel: 'Live Cycle',
        helpTitle: 'Voting Guide',
        helpSteps: [
            'Use the table to scan ideas quickly, then open the full idea page to vote, ask questions, and review activity history.',
            'Spend points carefully because all idea votes come from the same cycle budget.',
            'If voting is not open yet, wait for the countdown. Employees only see ideas after the submission window closes.',
        ],
        helpTips: [
            'Open `/dashboard/think-tank/vote/[id]` from the table for the full idea workflow.',
            'Super admins can still review or hold ideas before they are released to employees.',
        ],
    },
    results: {
        eyebrow: 'Reveal Board',
        title: 'Results And Learnings',
        description: 'Review revealed ideas, see final standings, and understand which proposals were shortlisted, approved, or blocked.',
        navLabel: 'Standings',
        helpTitle: 'Results Guide',
        helpSteps: [
            'Use the results page to compare revealed ideas and understand why certain ideas advanced further than others.',
            'Review decision notes, implementation state, and revealed collaborators for context.',
            'Treat results as a learning and execution tool, not only a ranking board.',
        ],
        helpTips: [
            'Super admins may see preview information before the reveal window is fully opened.',
            'Use the countdown when the next announcement is approaching.',
        ],
    },
    customization: {
        eyebrow: 'Governance Console',
        title: 'Customization And Controls',
        description: 'Manage Think Tank schedule rules, manual overrides, visibility controls, and vote-account repair tools as super admin.',
        navLabel: 'Customization',
        helpTitle: 'Admin Control Guide',
        helpSteps: [
            'Set the recurring submission, voting, and result schedule in the window customization area.',
            'Use manual override only for exceptional cases where the scheduled state must be changed immediately.',
            'Monitor point accounts and repair incorrect votes or voter balances from the vote point monitor.',
        ],
        helpTips: [
            'Window settings affect how the active cycle opens and closes automatically.',
            'Vote monitor actions are operational controls, so use them carefully and only when needed.',
        ],
    },
};

export default function ThinkTankPortal({ mode, ideaId }: { mode: PortalMode; ideaId?: string }) {
    const router = useRouter();
    const modeContent = THINK_TANK_MODE_CONTENT[mode];
    const [user, setUser] = useState<any>(null);
    const [assignees, setAssignees] = useState<Array<{ id: string; name?: string | null; email?: string | null; designation?: string | null }>>([]);
    const [loading, setLoading] = useState(true);
    const [governance, setGovernance] = useState<any>(null);
    const [governanceAccess, setGovernanceAccess] = useState<{ canManage?: boolean; override?: any } | null>(null);
    const [windowSettings, setWindowSettings] = useState<ThinkTankWindowSettings>(DEFAULT_WINDOW_SETTINGS);
    const [voteMonitor, setVoteMonitor] = useState<{ cycle: any; accounts: VoteMonitorAccount[] }>({ cycle: null, accounts: [] });
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
    const [settingsForm, setSettingsForm] = useState<ThinkTankWindowSettings>(DEFAULT_WINDOW_SETTINGS);
    const [savingSettings, setSavingSettings] = useState(false);
    const [updatingVoteMonitor, setUpdatingVoteMonitor] = useState(false);
    const [showSubmissionModal, setShowSubmissionModal] = useState(false);

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
            const [ideasRes, resultsRes, governanceRes, analyticsRes, usersRes, settingsRes, voteMonitorRes] = await Promise.all([
                fetch(`/api/think-tank/ideas?view=${view}`, { cache: 'no-store' }),
                fetch('/api/think-tank/results', { cache: 'no-store' }),
                fetch('/api/think-tank/governance', { cache: 'no-store' }),
                fetch('/api/think-tank/analytics', { cache: 'no-store' }),
                fetch('/api/users?limit=100', { cache: 'no-store' }),
                fetch('/api/think-tank/governance/settings', { cache: 'no-store' }),
                fetch('/api/think-tank/vote-monitor', { cache: 'no-store' }),
            ]);
            const ideasPayload = await ideasRes.json();
            const resultsPayload = await resultsRes.json();
            const governancePayload = await governanceRes.json();
            const analyticsPayload = await analyticsRes.json();
            const usersPayload = usersRes.ok ? await usersRes.json() : { data: [] };
            const settingsPayload = settingsRes.ok ? await settingsRes.json() : { settings: DEFAULT_WINDOW_SETTINGS };
            const voteMonitorPayload = voteMonitorRes.ok ? await voteMonitorRes.json() : { cycle: null, accounts: [] };
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
            setWindowSettings(settingsPayload.settings || DEFAULT_WINDOW_SETTINGS);
            setSettingsForm(settingsPayload.settings || DEFAULT_WINDOW_SETTINGS);
            setVoteMonitor(voteMonitorPayload);
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
            const message = payload.message || payload.error || 'Unable to save vote.';
            setError(message);
            if (response.status === 423) {
                showWarning(
                    governance?.nextVotingAt
                        ? `Voting is locked right now. It will open on ${formatDateTime(governance.nextVotingAt)}.`
                        : message,
                    { duration: 5000 }
                );
            } else {
                showError(message);
            }
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

    const handleWindowSettingsUpdate = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        setSavingSettings(true);
        try {
            const response = await fetch('/api/think-tank/governance/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settingsForm),
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.error || 'Failed to save window settings.');
            }
            await refresh();
        } catch (settingsError: any) {
            setError(settingsError.message || 'Failed to save window settings.');
        } finally {
            setSavingSettings(false);
        }
    };

    const handleVoteMonitorAction = async (payload: { action: 'REMOVE_VOTE'; voteId: string } | { action: 'RESET_POINTS'; cycleId: string; userId: string }) => {
        setError('');
        setUpdatingVoteMonitor(true);
        try {
            const response = await fetch('/api/think-tank/vote-monitor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const body = await response.json();
            if (!response.ok) {
                throw new Error(body.error || 'Failed to update vote monitor.');
            }
            setVoteMonitor(body);
            await refresh();
        } catch (voteMonitorError: any) {
            setError(voteMonitorError.message || 'Failed to update vote monitor.');
        } finally {
            setUpdatingVoteMonitor(false);
        }
    };

    const handleReviewUpdate = async (ideaId: string, payload: { reviewStage?: string; implementationStatus?: string; decisionNotes?: string; status?: string }) => {
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
                    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
                        <div className="space-y-8">
                            <FeatureGuidePanel
                                title={modeContent.helpTitle}
                                steps={modeContent.helpSteps}
                                tips={modeContent.helpTips}
                            />
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
                            
                            <GovernanceBanner governance={governance} settings={windowSettings} />
                            
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

                    {governanceAccess?.canManage ? (
                        <ReviewBoard
                            ideas={reviewIdeas}
                            assignees={assignees}
                            canVeto={canVeto}
                            onReviewUpdate={handleReviewUpdate}
                            onAddComment={handleAddComment}
                            onSaveReviewerScore={handleSaveReviewerScore}
                            onVetoIdea={handleVetoIdea}
                            onConvertIdea={handleConvertIdea}
                        />
                    ) : null}
                </div>
            );
        }

        if (mode === 'my-ideas') {
            return (
                <div className="space-y-12 animate-tt-fade-up">
                    <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
                        <div className="space-y-8">
                            <FeatureGuidePanel
                                title={modeContent.helpTitle}
                                steps={modeContent.helpSteps}
                                tips={modeContent.helpTips}
                            />
                            <GovernanceBanner governance={governance} settings={windowSettings} />

                            <div className="relative overflow-hidden rounded-[2rem] border-2 border-slate-950 bg-white p-8 shadow-sm">
                                <div className="absolute right-0 top-0 h-28 w-28 translate-x-10 -translate-y-10 rotate-45 bg-[#FF4500]" />
                                <div className="relative">
                                    <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#FF4500]">Submission Studio</p>
                                    <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-slate-950">Draft Proposal</h2>
                                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                                        Open the proposal popup when you are ready to write, attach files, select partners, and submit your idea into the active Think Tank cycle.
                                    </p>
                                    <div className="mt-6 flex flex-wrap gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowSubmissionModal(true)}
                                            className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#FF4500]"
                                        >
                                            Open Draft Proposal
                                        </button>
                                        <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-600">
                                            Popup workspace
                                        </span>
                                    </div>
                                </div>
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

                    {showSubmissionModal ? (
                        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
                            <div className="relative max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[2rem] border-2 border-slate-950 bg-[#fffdf8] shadow-[0_30px_120px_rgba(15,23,42,0.3)]">
                                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#FF4500]">Think Tank Popup</p>
                                        <h3 className="mt-1 text-xl font-black uppercase tracking-tight text-slate-950">Draft Proposal</h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowSubmissionModal(false)}
                                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
                                    >
                                        Close
                                    </button>
                                </div>
                                <div className="max-h-[calc(92vh-88px)] overflow-y-auto p-4 sm:p-6">
                                    <IdeaSubmissionForm
                                        user={user}
                                        categories={CATEGORIES}
                                        governance={governance}
                                        partnerOptions={assignees}
                                        refresh={refresh}
                                        onSubmitted={() => setShowSubmissionModal(false)}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            );
        }

        if (mode === 'vote') {
            return (
                <div className="space-y-6">
                    <FeatureGuidePanel
                        title={modeContent.helpTitle}
                        steps={modeContent.helpSteps}
                        tips={modeContent.helpTips}
                    />
                    <GovernanceBanner governance={governance} settings={windowSettings} />
                    {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
                    {!governance?.votingOpen && governance?.nextVotingAt ? (
                        <div className="space-y-4">
                            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                <div className="text-sm font-semibold text-slate-900">Voting Opens After Submission Review</div>
                                <div className="mt-2 text-sm text-slate-600">
                                    Ideas stay hidden from employees until the submission window closes and the voting window opens. Super admins can review and hold ideas before they become visible.
                                </div>
                            </div>
                            <CountdownTimer targetDate={governance.nextVotingAt} />
                        </div>
                    ) : null}
                    {pointAccount ? <PointAccountCard pointAccount={pointAccount} compact /> : null}
                    {(governance?.votingOpen || governanceAccess?.canManage) && selectedIdea ? (
                        <FullIdeaWorkspace
                            idea={selectedIdea}
                            userRole={user?.role}
                            pointAccount={pointAccount}
                            votingOpen={Boolean(governance?.votingOpen)}
                            nextVotingAt={governance?.nextVotingAt}
                            onBack={() => router.push('/dashboard/think-tank/vote')}
                            onVote={handleVote}
                            onVoteWithPoints={handleVoteWithPoints}
                            onAskQuestion={handleAskQuestion}
                            onAnswerQuestion={handleAnswerQuestion}
                            onDeleteIdea={user?.role === 'SUPER_ADMIN' ? handleDeleteIdea : undefined}
                        />
                    ) : governance?.votingOpen ? (
                        <VoteIdeaTable
                            title="Ideas for Vote"
                            ideas={ideas}
                            pointAccount={pointAccount}
                            onDeleteIdea={user?.role === 'SUPER_ADMIN' ? handleDeleteIdea : undefined}
                        />
                    ) : null}
                    {governanceAccess?.canManage ? (
                        <ReviewBoard
                            ideas={reviewIdeas}
                            assignees={assignees}
                            canVeto={canVeto}
                            onReviewUpdate={handleReviewUpdate}
                            onAddComment={handleAddComment}
                            onSaveReviewerScore={handleSaveReviewerScore}
                            onVetoIdea={handleVetoIdea}
                            onConvertIdea={handleConvertIdea}
                        />
                    ) : null}
                </div>
            );
        }

        if (mode === 'customization') {
            if (user?.role !== 'SUPER_ADMIN') {
                return (
                    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
                        Only super admins can access Think Tank customization.
                    </div>
                );
            }

            return (
                <div className="space-y-6">
                    <FeatureGuidePanel
                        title={modeContent.helpTitle}
                        steps={modeContent.helpSteps}
                        tips={modeContent.helpTips}
                    />
                    <GovernanceBanner governance={governance} settings={windowSettings} />
                    <WindowCustomizationPanel
                        settingsForm={settingsForm}
                        setSettingsForm={setSettingsForm}
                        currentSettings={windowSettings}
                        savingSettings={savingSettings}
                        onSubmit={handleWindowSettingsUpdate}
                    />
                    <GovernanceControlPanel
                        overrideForm={overrideForm}
                        setOverrideForm={setOverrideForm}
                        governance={governance}
                        updatingGovernance={updatingGovernance}
                        onSubmit={handleGovernanceUpdate}
                    />
                    <VoteMonitorPanel
                        monitor={voteMonitor}
                        updating={updatingVoteMonitor}
                        onAction={handleVoteMonitorAction}
                    />
                </div>
            );
        }

        return (
            <div className="space-y-6">
                <FeatureGuidePanel
                    title={modeContent.helpTitle}
                    steps={modeContent.helpSteps}
                    tips={modeContent.helpTips}
                />
                <GovernanceBanner governance={governance} settings={windowSettings} />
                
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
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,69,0,0.16),_transparent_30%),linear-gradient(180deg,_#fffdf8_0%,_#f5f7fb_100%)] text-slate-950 font-sans selection:bg-[#FF4500] selection:text-white pb-20">
            <style dangerouslySetInnerHTML={{ __html: TT_ANIMATIONS }} />
            
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                <ThinkTankWorkspaceHeader
                    mode={mode}
                    userRole={user?.role}
                    modeContent={modeContent}
                    governance={governance}
                    pointAccount={pointAccount}
                    onNavigate={(path) => router.push(path)}
                />

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

function ThinkTankWorkspaceHeader({
    mode,
    userRole,
    modeContent,
    governance,
    pointAccount,
    onNavigate,
}: {
    mode: PortalMode;
    userRole?: string | null;
    modeContent: typeof THINK_TANK_MODE_CONTENT[PortalMode];
    governance: any;
    pointAccount?: { basePoints: number; maxPerIdeaPoints: number; allocatedPoints: number; remainingPoints: number } | null;
    onNavigate: (path: string) => void;
}) {
    const navItems = [
        { id: 'dashboard', path: '/dashboard/think-tank', label: THINK_TANK_MODE_CONTENT.dashboard.navLabel, description: 'Cycle health, reviews, and performance snapshot.' },
        { id: 'my-ideas', path: '/dashboard/think-tank/my-ideas', label: THINK_TANK_MODE_CONTENT['my-ideas'].navLabel, description: 'Draft, submit, and track your own proposals.' },
        { id: 'vote', path: '/dashboard/think-tank/vote', label: THINK_TANK_MODE_CONTENT.vote.navLabel, description: 'Browse the voting queue and open full idea records.' },
        { id: 'results', path: '/dashboard/think-tank/results', label: THINK_TANK_MODE_CONTENT.results.navLabel, description: 'Revealed standings, lessons, and execution outcomes.' },
        ...(userRole === 'SUPER_ADMIN'
            ? [{ id: 'customization', path: '/dashboard/think-tank/customization', label: THINK_TANK_MODE_CONTENT.customization.navLabel, description: 'Schedule, override, and vote-control tools.' }]
            : []),
    ] as Array<{ id: string; path: string; label: string; description: string }>;

    return (
        <header className="mb-10 space-y-5 px-1 pt-4">
            <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
                <div className="relative overflow-hidden rounded-[2rem] border-2 border-slate-950 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
                    <div className="absolute right-0 top-0 h-40 w-40 translate-x-1/3 -translate-y-1/3 rounded-full bg-[#FF4500]/15" />
                    <div className="absolute bottom-0 left-0 h-24 w-24 -translate-x-1/4 translate-y-1/4 border-8 border-slate-950/10 rounded-full" />
                    <div className="relative">
                        <p className="text-[10px] font-black uppercase tracking-[0.45em] text-[#FF4500]">{modeContent.eyebrow}</p>
                        <h1 className="mt-3 text-4xl font-black uppercase tracking-tight text-slate-950 md:text-5xl">{modeContent.title}</h1>
                        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">{modeContent.description}</p>
                        <div className="mt-6 flex flex-wrap gap-2">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-600">
                                {governance?.label || 'Loading governance'}
                            </span>
                            {governance?.nextVotingAt && !governance?.votingOpen ? (
                                <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
                                    Voting opens {formatDateTime(governance.nextVotingAt)}
                                </span>
                            ) : null}
                            {pointAccount ? (
                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                                    {pointAccount.remainingPoints} / {pointAccount.basePoints} points available
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Current Mode</p>
                        <div className="mt-3 text-xl font-semibold text-slate-950">{modeContent.navLabel}</div>
                        <p className="mt-2 text-sm text-slate-600">{modeContent.description}</p>
                    </div>
                    <div className="rounded-[1.75rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">User Guidance</p>
                        <div className="mt-3 text-lg font-semibold">Built for guided use</div>
                        <p className="mt-2 text-sm text-white/75">Each screen now includes feature-specific instructions so people can submit, vote, review, and manage the cycle with less guesswork.</p>
                    </div>
                </div>
            </div>
            <div className="sticky top-2 z-40 rounded-[1.35rem] border border-slate-200 bg-white/92 p-2 shadow-[0_14px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:top-3 sm:rounded-[1.75rem] sm:p-3">
                <div className="mb-2 flex flex-wrap items-center gap-1.5 px-0.5 sm:mb-3 sm:gap-2 sm:px-1">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-slate-600">
                        {modeContent.navLabel}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        {governance?.label || 'Loading governance'}
                    </span>
                    {pointAccount ? (
                        <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700 sm:inline-flex">
                            {pointAccount.remainingPoints} points left
                        </span>
                    ) : null}
                </div>
                <nav className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:gap-2 sm:overflow-visible sm:pb-0 xl:grid-cols-5">
                {navItems.map((item) => {
                    const active = mode === item.id;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => onNavigate(item.path)}
                            className={`min-w-[150px] shrink-0 rounded-full border px-3 py-2 text-left transition-all sm:min-w-0 sm:rounded-[1.35rem] sm:px-4 sm:py-3 ${
                                active
                                    ? 'border-slate-950 bg-slate-950 text-white shadow-lg'
                                    : 'border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-[#FF4500] hover:shadow-md'
                            }`}
                        >
                            <div className={`hidden text-[10px] font-black uppercase tracking-[0.28em] sm:block ${active ? 'text-white/65' : 'text-slate-400'}`}>Workspace</div>
                            <div className="text-sm font-semibold sm:mt-1.5">{item.label}</div>
                            <div className={`mt-1.5 hidden text-xs leading-5 sm:block ${active ? 'text-white/75' : 'text-slate-500'}`}>{item.description}</div>
                        </button>
                    );
                })}
                </nav>
            </div>
        </header>
    );
}

function FeatureGuidePanel({
    title,
    steps,
    tips,
}: {
    title: string;
    steps: string[];
    tips: string[];
}) {
    return (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#FF4500]">Guided Use</p>
                    <h2 className="mt-3 text-2xl font-semibold text-slate-950">{title}</h2>
                    <div className="mt-5 grid gap-3">
                        {steps.map((step, index) => (
                            <div key={`${title}-step-${index}`} className="flex gap-3 rounded-2xl bg-slate-50 px-4 py-4">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
                                    {index + 1}
                                </div>
                                <div className="text-sm leading-6 text-slate-700">{step}</div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,_rgba(255,69,0,0.08),_rgba(255,255,255,1))] p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Helpful Notes</p>
                    <div className="mt-4 space-y-3">
                        {tips.map((tip, index) => (
                            <div key={`${title}-tip-${index}`} className="rounded-2xl bg-white px-4 py-4 text-sm leading-6 text-slate-700 shadow-sm">
                                {tip}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
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

function formatOrdinal(value: number) {
    if (value === 1) return '1st';
    if (value === 2) return '2nd';
    if (value === 3) return '3rd';
    return `${value}th`;
}

function formatScheduleSummary(settings: ThinkTankWindowSettings) {
    const resultDays = settings.resultSaturdays.map(formatOrdinal).join(' and ');
    const votingDay = WEEKDAY_OPTIONS.find((option) => option.value === settings.votingEndDay)?.label || 'Friday';
    return `Results announce on the ${resultDays} Saturday of each month at ${settings.resultTime} IST. Ideas open from day 1 of the month or immediately after the last result announcement for ${settings.ideaSubmissionDays} day(s). Voting stays open until ${votingDay} ${settings.votingEndTime} IST before the result Saturday.`;
}

function GovernanceBanner({ governance, settings }: { governance: any; settings: ThinkTankWindowSettings }) {
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
            <div className="mt-1 text-xs text-slate-500">{formatScheduleSummary(settings)}</div>
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

function WindowCustomizationPanel({
    settingsForm,
    setSettingsForm,
    currentSettings,
    savingSettings,
    onSubmit,
}: {
    settingsForm: ThinkTankWindowSettings;
    setSettingsForm: Dispatch<SetStateAction<ThinkTankWindowSettings>>;
    currentSettings: ThinkTankWindowSettings;
    savingSettings: boolean;
    onSubmit: (event: FormEvent) => void;
}) {
    return (
        <form onSubmit={onSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Window Customization</h2>
                    <p className="mt-1 text-sm text-slate-600">Control result announcements, idea window length, and voting lock timing for the Think Tank cycle.</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Active rule: <span className="font-semibold text-slate-900">{formatScheduleSummary(currentSettings)}</span>
                </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-700">
                    <span className="font-medium">Result Saturdays</span>
                    <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4, 5].map((value) => {
                            const active = settingsForm.resultSaturdays.includes(value);
                            return (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setSettingsForm((current) => ({
                                        ...current,
                                        resultSaturdays: active
                                            ? current.resultSaturdays.filter((day) => day !== value)
                                            : [...current.resultSaturdays, value].sort((a, b) => a - b),
                                    }))}
                                    className={`rounded-2xl px-4 py-3 text-sm font-semibold ${active ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}
                                >
                                    {formatOrdinal(value)}
                                </button>
                            );
                        })}
                    </div>
                </label>
                <label className="grid gap-2 text-sm text-slate-700">
                    <span className="font-medium">Result Time (IST)</span>
                    <input
                        type="time"
                        className="rounded-2xl border border-slate-200 px-4 py-3"
                        value={settingsForm.resultTime}
                        onChange={(event) => setSettingsForm((current) => ({ ...current, resultTime: event.target.value }))}
                    />
                </label>
                <label className="grid gap-2 text-sm text-slate-700">
                    <span className="font-medium">Idea Submission Days</span>
                    <input
                        type="number"
                        min={1}
                        max={31}
                        className="rounded-2xl border border-slate-200 px-4 py-3"
                        value={settingsForm.ideaSubmissionDays}
                        onChange={(event) => setSettingsForm((current) => ({ ...current, ideaSubmissionDays: Number(event.target.value) || 1 }))}
                    />
                </label>
                <label className="grid gap-2 text-sm text-slate-700">
                    <span className="font-medium">Voting End Day</span>
                    <select
                        className="rounded-2xl border border-slate-200 px-4 py-3"
                        value={String(settingsForm.votingEndDay)}
                        onChange={(event) => setSettingsForm((current) => ({ ...current, votingEndDay: Number(event.target.value) }))}
                    >
                        {WEEKDAY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </label>
                <label className="grid gap-2 text-sm text-slate-700 md:col-span-2">
                    <span className="font-medium">Voting End Time (IST)</span>
                    <input
                        type="time"
                        className="rounded-2xl border border-slate-200 px-4 py-3"
                        value={settingsForm.votingEndTime}
                        onChange={(event) => setSettingsForm((current) => ({ ...current, votingEndTime: event.target.value }))}
                    />
                </label>
            </div>
            <div className="mt-5 flex justify-end">
                <button
                    type="submit"
                    disabled={savingSettings}
                    className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                    {savingSettings ? 'Saving…' : 'Save Window Settings'}
                </button>
            </div>
        </form>
    );
}

function VoteMonitorPanel({
    monitor,
    updating,
    onAction,
}: {
    monitor: { cycle: any; accounts: VoteMonitorAccount[] };
    updating: boolean;
    onAction: (payload: { action: 'REMOVE_VOTE'; voteId: string } | { action: 'RESET_POINTS'; cycleId: string; userId: string }) => Promise<void>;
}) {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'ALL' | 'HAS_VOTES' | 'HAS_ISSUES'>('ALL');
    const [sortBy, setSortBy] = useState<'allocated' | 'remaining' | 'updated' | 'name'>('allocated');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const filteredAccounts = [...monitor.accounts]
        .filter((account) => {
            const query = search.trim().toLowerCase();
            const matchesSearch = !query || [
                account.user.name,
                account.user.email,
                account.user.role,
                account.user.designation,
                account.userId,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(query);

            const hasIssues = account.allocatedPoints + account.remainingPoints !== account.basePoints
                || account.votes.some((vote) => vote.pointAllocation > account.maxPerIdeaPoints);
            const matchesFilter = filter === 'ALL'
                || (filter === 'HAS_VOTES' && account.votes.length > 0)
                || (filter === 'HAS_ISSUES' && hasIssues);

            return matchesSearch && matchesFilter;
        })
        .sort((a, b) => {
            const direction = sortDirection === 'asc' ? 1 : -1;
            if (sortBy === 'allocated') return (a.allocatedPoints - b.allocatedPoints) * direction;
            if (sortBy === 'remaining') return (a.remainingPoints - b.remainingPoints) * direction;
            if (sortBy === 'updated') return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * direction;
            const aLabel = (a.user.name || a.user.email || a.userId).toLowerCase();
            const bLabel = (b.user.name || b.user.email || b.userId).toLowerCase();
            return aLabel.localeCompare(bLabel) * direction;
        });

    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Vote Point Monitor</h2>
                    <p className="mt-1 text-sm text-slate-600">Super admins can inspect point usage, remove bad votes, and rebuild a voter&apos;s cycle points from recorded votes.</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Active cycle: <span className="font-semibold text-slate-900">{monitor.cycle?.cycleLabel || 'No active cycle'}</span>
                </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px_220px_160px]">
                <input
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    placeholder="Search voter by name, email, role, designation, or ID"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                />
                <select
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    value={filter}
                    onChange={(event) => setFilter(event.target.value as 'ALL' | 'HAS_VOTES' | 'HAS_ISSUES')}
                >
                    <option value="ALL">All Accounts</option>
                    <option value="HAS_VOTES">Has Votes</option>
                    <option value="HAS_ISSUES">Potential Issues</option>
                </select>
                <select
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as 'allocated' | 'remaining' | 'updated' | 'name')}
                >
                    <option value="allocated">Sort by Allocated</option>
                    <option value="remaining">Sort by Remaining</option>
                    <option value="updated">Sort by Last Updated</option>
                    <option value="name">Sort by Name</option>
                </select>
                <select
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    value={sortDirection}
                    onChange={(event) => setSortDirection(event.target.value as 'asc' | 'desc')}
                >
                    <option value="desc">Desc</option>
                    <option value="asc">Asc</option>
                </select>
            </div>
            <div className="mt-5 space-y-4">
                {filteredAccounts.length > 0 ? filteredAccounts.map((account) => (
                    <div key={account.id} className="rounded-3xl border border-slate-200 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <div className="text-sm font-semibold text-slate-900">{account.user.name || account.user.email || account.userId}</div>
                                <div className="mt-1 text-sm text-slate-500">
                                    {account.user.email || account.userId}
                                    {account.user.designation ? ` • ${account.user.designation}` : ''}
                                    {account.user.role ? ` • ${formatThinkTankLabel(account.user.role, account.user.role)}` : ''}
                                </div>
                            </div>
                            <div className="grid gap-2 md:grid-cols-4">
                                <MiniMetric label="Base" value={account.basePoints} />
                                <MiniMetric label="Allocated" value={account.allocatedPoints} />
                                <MiniMetric label="Remaining" value={account.remainingPoints} />
                                <MiniMetric label="Max / Idea" value={account.maxPerIdeaPoints} />
                            </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3">
                            <button
                                type="button"
                                disabled={updating || !monitor.cycle?.id}
                                onClick={() => monitor.cycle?.id && onAction({ action: 'RESET_POINTS', cycleId: monitor.cycle.id, userId: account.userId })}
                                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                            >
                                {updating ? 'Updating…' : 'Reset Points From Votes'}
                            </button>
                        </div>
                        <div className="mt-4 space-y-3">
                            {account.votes.length > 0 ? account.votes.map((vote) => (
                                <div key={vote.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
                                    <div>
                                        <div className="text-sm font-semibold text-slate-900">{vote.idea.topic}</div>
                                        <div className="mt-1 text-xs text-slate-500">
                                            {vote.vote} • {vote.pointAllocation} pt • weighted {vote.weightedValue} • {formatDateTime(vote.updatedAt)}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={updating}
                                        onClick={() => onAction({ action: 'REMOVE_VOTE', voteId: vote.id })}
                                        className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                                    >
                                        {updating ? 'Updating…' : 'Remove Vote'}
                                    </button>
                                </div>
                            )) : (
                                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                                    No votes recorded for this voter in the active cycle.
                                </div>
                            )}
                        </div>
                    </div>
                )) : (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                        No vote monitor entries match the current search or filter.
                    </div>
                )}
            </div>
        </div>
    );
}

function VoteIdeaTable({
    title,
    ideas,
    pointAccount,
    onDeleteIdea,
}: {
    title: string;
    ideas: Idea[];
    pointAccount?: { basePoints: number; maxPerIdeaPoints: number; allocatedPoints: number; remainingPoints: number } | null;
    onDeleteIdea?: (ideaId: string) => Promise<void>;
}) {
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [sortBy, setSortBy] = useState<'createdAt' | 'votes' | 'score' | 'category' | 'title'>('score');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const filteredIdeas = [...ideas]
        .filter((idea) => {
            const query = search.trim().toLowerCase();
            const matchesSearch = !query || `${idea.topic} ${idea.description} ${idea.category}`.toLowerCase().includes(query);
            const matchesCategory = categoryFilter === 'ALL' || idea.category === categoryFilter;
            return matchesSearch && matchesCategory;
        })
        .sort((a, b) => {
            const direction = sortDirection === 'asc' ? 1 : -1;
            if (sortBy === 'votes') return (a.voteCount - b.voteCount) * direction;
            if (sortBy === 'score') return ((a.communityScore ?? a.weightedScore) - (b.communityScore ?? b.weightedScore)) * direction;
            if (sortBy === 'category') return a.category.localeCompare(b.category) * direction;
            if (sortBy === 'title') return a.topic.localeCompare(b.topic) * direction;
            return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * direction;
        });

    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
                    <p className="mt-1 text-sm text-slate-600">Use the table to scan ideas quickly, then open a dedicated idea page for full voting, Q&amp;A, and activity history.</p>
                </div>
                {pointAccount ? (
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        Remaining <span className="font-semibold text-slate-950">{pointAccount.remainingPoints}</span> / {pointAccount.basePoints}
                    </div>
                ) : null}
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px_220px_160px]">
                <input
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    placeholder="Search by topic, description, or category"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                />
                <select
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                >
                    <option value="ALL">All Categories</option>
                    {Array.from(new Set(ideas.map((idea) => idea.category))).sort().map((category) => (
                        <option key={category} value={category}>{formatThinkTankLabel(category)}</option>
                    ))}
                </select>
                <select
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as 'createdAt' | 'votes' | 'score' | 'category' | 'title')}
                >
                    <option value="score">Sort by Score</option>
                    <option value="votes">Sort by Votes</option>
                    <option value="createdAt">Sort by Created</option>
                    <option value="category">Sort by Category</option>
                    <option value="title">Sort by Title</option>
                </select>
                <select
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    value={sortDirection}
                    onChange={(event) => setSortDirection(event.target.value as 'asc' | 'desc')}
                >
                    <option value="desc">Desc</option>
                    <option value="asc">Asc</option>
                </select>
            </div>
            <div className="mt-5 overflow-x-auto">
                <table className="min-w-full border-collapse text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                            <th className="px-4 py-3">Idea</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Votes</th>
                            <th className="px-4 py-3">Score</th>
                            <th className="px-4 py-3">Updated</th>
                            <th className="px-4 py-3">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredIdeas.length > 0 ? filteredIdeas.map((idea) => (
                            <tr key={idea.id} className="border-b border-slate-100 align-top">
                                <td className="px-4 py-4">
                                    <div className="font-semibold text-slate-900">{idea.topic}</div>
                                    <div className="mt-1 line-clamp-2 max-w-xl text-slate-600">{idea.description}</div>
                                </td>
                                <td className="px-4 py-4 text-slate-700">{formatThinkTankLabel(idea.category)}</td>
                                <td className="px-4 py-4 text-slate-700">{idea.voteCount}</td>
                                <td className="px-4 py-4 text-slate-700">{idea.communityScore ?? idea.weightedScore}</td>
                                <td className="px-4 py-4 text-slate-500">{formatDateTime(idea.createdAt)}</td>
                                <td className="px-4 py-4">
                                    <div className="flex flex-wrap gap-2">
                                        <Link
                                            href={`/dashboard/think-tank/vote/${idea.id}`}
                                            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                                        >
                                            Open Full Idea
                                        </Link>
                                        {onDeleteIdea ? (
                                            <button
                                                type="button"
                                                onClick={() => onDeleteIdea(idea.id)}
                                                className="rounded-full bg-rose-100 px-4 py-2 text-xs font-semibold text-rose-700"
                                            >
                                                Delete
                                            </button>
                                        ) : null}
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                                    No ideas match the current search or filter.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function FullIdeaWorkspace({
    idea,
    userRole,
    pointAccount,
    votingOpen,
    nextVotingAt,
    onBack,
    onVote,
    onVoteWithPoints,
    onAskQuestion,
    onAnswerQuestion,
    onDeleteIdea,
}: {
    idea: Idea;
    userRole?: string | null;
    pointAccount?: { basePoints: number; maxPerIdeaPoints: number; allocatedPoints: number; remainingPoints: number } | null;
    votingOpen: boolean;
    nextVotingAt?: string | null;
    onBack: () => void;
    onVote: (ideaId: string, vote: 'LIKE' | 'UNLIKE' | 'NEUTRAL') => void;
    onVoteWithPoints: (ideaId: string, vote: 'LIKE' | 'UNLIKE' | 'NEUTRAL', pointAllocation: number) => void;
    onAskQuestion: (ideaId: string, question: string) => Promise<void>;
    onAnswerQuestion: (questionId: string, answer: string) => Promise<void>;
    onDeleteIdea?: (ideaId: string) => Promise<void>;
}) {
    const activityCount = (idea.comments?.length || 0) + (idea.questions?.length || 0) + (idea.attachments?.length || 0);
    const [hasShownLockedToast, setHasShownLockedToast] = useState(false);

    useEffect(() => {
        if (votingOpen || hasShownLockedToast) return;
        showInfo(
            nextVotingAt
                ? `Voting is still locked for this idea. It will open on ${formatDateTime(nextVotingAt)}.`
                : 'Voting is still locked for this idea. You can review the details now and vote when the window opens.',
            { duration: 5000 }
        );
        setHasShownLockedToast(true);
    }, [hasShownLockedToast, nextVotingAt, votingOpen]);

    return (
        <div className="space-y-6">
            <div className="rounded-[2rem] border-2 border-slate-950 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-4xl">
                        <button
                            type="button"
                            onClick={onBack}
                            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
                        >
                            Back to vote table
                        </button>
                        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.35em] text-[#FF4500]">{formatThinkTankLabel(idea.category)}</p>
                        <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">{idea.topic}</h2>
                        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
                            This full idea page is the working record for discussion, questions, files, voting changes, and review signals connected to this proposal.
                        </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <MiniMetric label="Votes" value={idea.voteCount} />
                        <MiniMetric label="Community" value={Math.round(idea.communityScore ?? idea.weightedScore)} />
                        <MiniMetric label="Final" value={Math.round(idea.finalScore ?? idea.weightedScore)} />
                        <MiniMetric label="Activity" value={activityCount} />
                    </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-600">
                        Status {idea.status}
                    </span>
                    {idea.reviewStage ? (
                        <span className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">
                            Review {idea.reviewStage}
                        </span>
                    ) : null}
                    {idea.implementationStatus ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                            Implementation {idea.implementationStatus}
                        </span>
                    ) : null}
                    {idea.currentVote ? (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
                            Your vote {formatThinkTankLabel(idea.currentVote.vote, 'Vote')} with {idea.currentVote.pointAllocation} points
                        </span>
                    ) : null}
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-6">
                    <FeatureGuidePanel
                        title="How To Work With One Idea"
                        steps={[
                            'Read the idea carefully, then use the point vote section to support, oppose, or stay neutral with a deliberate point allocation.',
                            'Use the Q&A area to clarify gaps before spending points, especially when the idea is complex or cross-functional.',
                            'Treat this page as the full working record for this proposal while the cycle is active.',
                        ]}
                        tips={[
                            'Voting changes, questions, comments, and file references all stay connected to this idea page.',
                            'If you already voted, the same controls let you update your decision and reallocate your points.',
                        ]}
                    />
                    {!votingOpen ? (
                        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                            <div className="font-semibold">Voting is not open yet</div>
                            <div className="mt-2">
                                This idea detail page is available for review, comments, and Q&amp;A, but point voting stays locked until the voting window opens.
                                {nextVotingAt ? ` Voting opens on ${formatDateTime(nextVotingAt)}.` : ''}
                            </div>
                        </div>
                    ) : null}
                    <IdeaGrid
                        title="Full Idea Activity"
                        ideas={[idea]}
                        showVoting={votingOpen}
                        pointAccount={pointAccount}
                        canAnswerQuestions={canManageThinkTankRole(userRole)}
                        onVote={onVote}
                        onVoteWithPoints={onVoteWithPoints}
                        onAskQuestion={onAskQuestion}
                        onAnswerQuestion={onAnswerQuestion}
                        onDeleteIdea={onDeleteIdea}
                        singleIdeaView
                    />
                </div>
                <div className="space-y-6">
                    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Idea Snapshot</p>
                        <div className="mt-4 space-y-4">
                            <div className="rounded-2xl bg-slate-50 p-4">
                                <div className="text-sm font-semibold text-slate-900">Timing</div>
                                <div className="mt-2 text-sm text-slate-600">Created {formatDateTime(idea.createdAt)}</div>
                                {idea.revealedAt ? <div className="mt-1 text-sm text-slate-600">Revealed {formatDateTime(idea.revealedAt)}</div> : null}
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-4">
                                <div className="text-sm font-semibold text-slate-900">Participation</div>
                                <div className="mt-2 text-sm text-slate-600">{idea.voteCount} votes recorded</div>
                                <div className="mt-1 text-sm text-slate-600">{idea.questions?.length || 0} questions and {(idea.comments?.length || 0)} comments</div>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-4">
                                <div className="text-sm font-semibold text-slate-900">Files And Team</div>
                                <div className="mt-2 text-sm text-slate-600">{idea.attachments?.length || 0} attachments linked</div>
                                <div className="mt-1 text-sm text-slate-600">{(idea.partners?.length || 0) + (idea.teamMembers?.length || 0)} collaborators and members attached</div>
                            </div>
                        </div>
                    </div>
                    {pointAccount ? <PointAccountCard pointAccount={pointAccount} /> : null}
                </div>
            </div>
        </div>
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
    onReviewUpdate: (ideaId: string, payload: { reviewStage?: string; implementationStatus?: string; decisionNotes?: string; status?: string }) => Promise<void>;
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
    const [reviewSearch, setReviewSearch] = useState('');
    const [reviewStageFilter, setReviewStageFilter] = useState('ALL');
    const [expandedIdeaId, setExpandedIdeaId] = useState<string | null>(null);
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

    const filteredIdeas = useMemo(() => {
        const term = reviewSearch.trim().toLowerCase();
        return ideas.filter((idea) => {
            const matchesStage = reviewStageFilter === 'ALL' || (idea.reviewStage || 'SUBMITTED') === reviewStageFilter;
            if (!matchesStage) return false;
            if (!term) return true;
            return [
                idea.topic,
                idea.description,
                idea.category,
                idea.status,
                idea.reviewStage,
                idea.implementationStatus,
                idea.author?.name,
                idea.author?.email,
            ].some((value) => value?.toLowerCase().includes(term));
        });
    }, [ideas, reviewSearch, reviewStageFilter]);

    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Review Board</h2>
                    <p className="mt-1 text-sm text-slate-600">Review ideas in a compact queue, then open the full detail page for deeper discussion and activity history.</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    {filteredIdeas.length} of {ideas.length} ideas
                </div>
            </div>
            <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_220px]">
                <input
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    placeholder="Search by topic, author, stage, status, or category"
                    value={reviewSearch}
                    onChange={(event) => setReviewSearch(event.target.value)}
                />
                <select
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    value={reviewStageFilter}
                    onChange={(event) => setReviewStageFilter(event.target.value)}
                >
                    <option value="ALL">All review stages</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="SHORTLISTED">Shortlisted</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="IMPLEMENTED">Implemented</option>
                </select>
            </div>
            <div className="space-y-4">
                {filteredIdeas.map((idea) => (
                    <div key={idea.id} className="rounded-3xl border border-slate-200 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">{formatThinkTankLabel(idea.category)}</span>
                                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
                                        {idea.status}
                                    </span>
                                    <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-700">
                                        {idea.reviewStage || 'SUBMITTED'}
                                    </span>
                                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                                        {idea.implementationStatus || 'NOT_STARTED'}
                                    </span>
                                </div>
                                <h3 className="mt-3 text-lg font-semibold text-slate-950">{idea.topic}</h3>
                                <p className="mt-2 line-clamp-2 text-sm text-slate-600">{idea.description}</p>
                                <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
                                    <span>Author: {idea.author?.name || idea.author?.email || 'Hidden'}</span>
                                    <span>Created: {formatDateTime(idea.createdAt)}</span>
                                </div>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Community <div className="mt-1 font-semibold text-slate-900">{idea.communityScore ?? idea.weightedScore}</div></div>
                                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Reviewer <div className="mt-1 font-semibold text-slate-900">{idea.reviewerScore ?? 0}</div></div>
                                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Final <div className="mt-1 font-semibold text-slate-900">{idea.finalScore ?? idea.weightedScore}</div></div>
                                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Votes <div className="mt-1 font-semibold text-slate-900">{idea.voteCount}</div></div>
                            </div>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                            <div className="flex flex-wrap gap-2">
                                <Link
                                    href={`/dashboard/think-tank/vote/${idea.id}`}
                                    className="rounded-2xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
                                >
                                    Open Detail Page
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => setExpandedIdeaId((current) => current === idea.id ? null : idea.id)}
                                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
                                >
                                    {expandedIdeaId === idea.id ? 'Hide Quick Review' : 'Manage Inline'}
                                </button>
                            </div>
                            <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                                {idea.comments?.length || 0} comments • {idea.questions?.length || 0} questions • {idea.attachments?.length || 0} files
                            </div>
                        </div>
                        {expandedIdeaId !== idea.id ? null : (
                            <div className="mt-4 border-t border-slate-200 pt-4">
                        {idea.isVetoed ? (
                            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                                <div className="font-semibold">Super Admin veto applied</div>
                                <div className="mt-1">{idea.vetoReason || 'No reason recorded.'}</div>
                                <div className="mt-1 text-rose-700">Vetoed on {formatDateTime(idea.vetoedAt || null)}</div>
                            </div>
                        ) : null}
                        <div className="mt-4 grid gap-3 md:grid-cols-[180px_200px_220px_1fr_auto] md:items-end">
                            <label className="grid gap-2 text-sm text-slate-700">
                                <span className="font-medium">Public visibility</span>
                                <select
                                    className="rounded-2xl border border-slate-200 px-4 py-3"
                                    defaultValue={idea.status || 'ACTIVE'}
                                    onChange={(event) => onReviewUpdate(idea.id, { status: event.target.value })}
                                >
                                    <option value="ACTIVE">Visible in voting</option>
                                    <option value="LOCKED">Hold from employees</option>
                                    <option value="ARCHIVED">Archive</option>
                                </select>
                            </label>
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
                        )}
                    </div>
                ))}
                {!filteredIdeas.length ? (
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                        No review ideas match the current search or stage filter.
                    </div>
                ) : null}
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
    const [voteInputs, setVoteInputs] = useState<Record<string, 'LIKE' | 'UNLIKE' | 'NEUTRAL'>>({});
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
                                        <div className="text-sm font-semibold text-slate-900">Point rating and sentiment</div>
                                        <div className="mt-1 text-sm text-slate-600">
                                            {idea.currentVote
                                                ? 'You have already rated this idea. Update your points or sentiment below and submit again to save changes.'
                                                : 'Set your points with the slider or number field, choose your sentiment, and submit once.'}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        {idea.currentVote ? (
                                            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
                                                Current sentiment: <span className="font-semibold">{formatThinkTankLabel(idea.currentVote.vote, 'Vote')}</span>
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
                                <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_220px_auto] xl:items-end">
                                    <div className="grid gap-3">
                                        <label className="grid gap-2 text-sm text-slate-700">
                                            <span className="font-medium">Points for this idea</span>
                                            <input
                                                type="range"
                                                min={0}
                                                max={pointAccount?.maxPerIdeaPoints || 0}
                                                step={1}
                                                className="w-full accent-slate-900"
                                                value={pointInputs[idea.id] ?? idea.currentVote?.pointAllocation ?? pointAccount?.maxPerIdeaPoints ?? 0}
                                                onChange={(event) => setPointInputs((current) => ({ ...current, [idea.id]: Number(event.target.value) }))}
                                            />
                                        </label>
                                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                                            <span>0</span>
                                            <span>{pointAccount?.maxPerIdeaPoints || 0} max</span>
                                        </div>
                                    </div>
                                    <label className="grid gap-2 text-sm text-slate-700">
                                        <span className="font-medium">Direct points entry</span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={pointAccount?.maxPerIdeaPoints || 0}
                                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                                            value={pointInputs[idea.id] ?? idea.currentVote?.pointAllocation ?? pointAccount?.maxPerIdeaPoints ?? 0}
                                            onChange={(event) => setPointInputs((current) => ({ ...current, [idea.id]: Number(event.target.value) }))}
                                        />
                                    </label>
                                    <label className="grid gap-2 text-sm text-slate-700">
                                        <span className="font-medium">Sentiment for analytics</span>
                                        <select
                                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                                            value={voteInputs[idea.id] ?? idea.currentVote?.vote ?? 'LIKE'}
                                            onChange={(event) => setVoteInputs((current) => ({ ...current, [idea.id]: event.target.value as 'LIKE' | 'UNLIKE' | 'NEUTRAL' }))}
                                        >
                                            <option value="LIKE">Support</option>
                                            <option value="NEUTRAL">Neutral</option>
                                            <option value="UNLIKE">Oppose</option>
                                        </select>
                                    </label>
                                </div>
                                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                    <div className="text-xs text-slate-500">
                                        The selected sentiment is stored for analytics counts. Your entered points are the actual score contribution for this idea.
                                    </div>
                                    <button
                                        onClick={() => (onVoteWithPoints || ((targetId: string, targetVote: 'LIKE' | 'UNLIKE' | 'NEUTRAL', _points: number) => onVote(targetId, targetVote)))(
                                            idea.id,
                                            voteInputs[idea.id] ?? idea.currentVote?.vote ?? 'LIKE',
                                            pointInputs[idea.id] ?? idea.currentVote?.pointAllocation ?? pointAccount?.maxPerIdeaPoints ?? 0,
                                        )}
                                        className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#FF4500]"
                                    >
                                        {idea.currentVote ? 'Update Rating' : 'Submit Rating'}
                                    </button>
                                </div>
                                {idea.currentVote ? (
                                    <div className="mt-3 text-xs text-slate-500">
                                        Last updated {formatDateTime(idea.currentVote.updatedAt)}. Each user can rate once per idea, but can edit the points and sentiment later.
                                    </div>
                                ) : (
                                    <div className="mt-3 text-xs text-slate-500">
                                        You can rate once per idea. After that, you can edit your saved points and sentiment.
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
