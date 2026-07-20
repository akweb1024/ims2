'use client';

import { useCallback, useEffect, useState } from 'react';
import { History, MessageSquare, Send } from 'lucide-react';

interface TaskCommentRow {
    id: string;
    content: string;
    createdAt: string;
    user: { id: string; name: string | null; email: string; role: string };
}

interface HistoryEntry {
    id: string;
    action: string;
    createdAt: string;
    by: string;
    changes?: { from?: string; to?: string; comment?: string } | null;
}

// Comment thread + priority-change history for one work assignment.
// Mounted lazily (only when the card's discussion section is expanded).
export default function TaskDiscussion({ taskId }: { taskId: string }) {
    const [comments, setComments] = useState<TaskCommentRow[]>([]);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [cRes, hRes] = await Promise.all([
                fetch(`/api/work-assignments/${taskId}/comments`),
                fetch(`/api/work-assignments/${taskId}/history`),
            ]);
            if (cRes.ok) setComments(await cRes.json());
            if (hRes.ok) {
                const h = await hRes.json();
                const entries: HistoryEntry[] = Array.isArray(h) ? h : h.history || [];
                setHistory(entries.filter((e) => e.action === 'priority_change'));
            }
        } catch {
            // Both sections degrade to empty states.
        } finally {
            setLoading(false);
        }
    }, [taskId]);

    useEffect(() => { load(); }, [load]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!draft.trim()) return;
        setSending(true);
        setError('');
        try {
            const res = await fetch(`/api/work-assignments/${taskId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: draft })
            });
            if (res.ok) {
                setDraft('');
                const created = await res.json();
                setComments((prev) => [...prev, created]);
            } else {
                const err = await res.json().catch(() => ({}));
                setError(err.error || 'Failed to post comment');
            }
        } catch {
            setError('Network error while posting comment');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="mt-4 pt-4 border-t border-secondary-100 space-y-4">
            <div>
                <h4 className="text-xs font-black text-secondary-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <MessageSquare size={13} /> Comments
                </h4>
                {loading ? (
                    <p className="text-xs text-secondary-400">Loading discussion...</p>
                ) : comments.length ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {comments.map((comment) => (
                            <div key={comment.id} className="p-3 bg-secondary-50/60 rounded-xl">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-secondary-900">
                                        {comment.user.name || comment.user.email}
                                    </span>
                                    <span className="text-[10px] text-secondary-400">
                                        {new Date(comment.createdAt).toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-sm text-secondary-700 mt-1 whitespace-pre-wrap">{comment.content}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-secondary-400 italic">No comments yet.</p>
                )}

                <form onSubmit={handleSend} className="flex gap-2 mt-3">
                    <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="Write a comment..."
                        className="input-premium flex-1 text-sm"
                        maxLength={5000}
                    />
                    <button
                        type="submit"
                        disabled={sending || !draft.trim()}
                        className="btn btn-primary px-4 flex items-center gap-1.5 text-sm disabled:opacity-50"
                    >
                        <Send size={14} /> {sending ? 'Sending...' : 'Send'}
                    </button>
                </form>
                {error && <p className="text-xs text-danger-600 mt-1">{error}</p>}
            </div>

            {history.length > 0 && (
                <div>
                    <h4 className="text-xs font-black text-secondary-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <History size={13} /> Priority Changes
                    </h4>
                    <div className="space-y-1.5">
                        {history.map((entry) => (
                            <div key={entry.id} className="text-xs text-secondary-600 flex items-baseline gap-2">
                                <span className="text-secondary-400 shrink-0">{new Date(entry.createdAt).toLocaleDateString()}</span>
                                <span>
                                    <span className="font-bold">{entry.by}</span>
                                    {' '}changed priority{entry.changes?.from && entry.changes?.to ? ` ${entry.changes.from} → ${entry.changes.to}` : ''}
                                    {entry.changes?.comment && <span className="italic"> — “{entry.changes.comment}”</span>}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
