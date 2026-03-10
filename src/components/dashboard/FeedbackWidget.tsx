'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquarePlus, X, Send, Paperclip, ChevronLeft,
    Bug, Lightbulb, Star, HelpCircle, CheckCheck, Check,
    FileText, Image as ImageIcon, AlertCircle, Loader2, Plus,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────── */
interface Attachment { url: string; filename: string; size: number; mimeType: string; }
interface Message {
    id: string; content: string; isAdminReply: boolean; createdAt: string;
    sender?: { id: string; name?: string | null; email?: string; } | null;
    attachments: Attachment[];
    isOptimistic?: boolean;
}
interface Thread {
    id: string; category: string; priority: string; status: string; title?: string | null;
    createdAt: string; updatedAt: string;
    messages: Message[];
    _count?: { messages: number };
}

/* ─── Config ────────────────────────────────────────────────── */
const CATEGORIES = [
    { id: 'BUG',     label: 'Bug Report',   Icon: Bug         },
    { id: 'FEATURE', label: 'Feature',      Icon: Lightbulb   },
    { id: 'GENERAL', label: 'Feedback',     Icon: Star        },
    { id: 'QUESTION',label: 'Question',     Icon: HelpCircle  },
];

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const PRIORITY_COLORS: Record<string, string> = {
    LOW:      'text-emerald-400',
    MEDIUM:   'text-amber-400',
    HIGH:     'text-orange-400',
    CRITICAL: 'text-rose-400',
};

const STATUS_COLORS: Record<string, string> = {
    OPEN:        'bg-blue-500/20 text-blue-300',
    IN_PROGRESS: 'bg-amber-500/20 text-amber-300',
    RESOLVED:    'bg-emerald-500/20 text-emerald-300',
    CLOSED:      'bg-slate-500/20 text-slate-400',
};

function formatSize(bytes: number) {
    if (bytes < 1024)             return `${bytes}B`;
    if (bytes < 1024 * 1024)      return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/* ─── Attachment Preview ────────────────────────────────────── */
function AttachmentPreview({ a }: { a: Attachment }) {
    const isImage = a.mimeType.startsWith('image/');
    return (
        <a href={a.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-700/60 border border-white/10 hover:border-blue-500/40 transition-colors text-xs group">
            {isImage
                ? <img src={a.url} alt={a.filename} className="h-6 w-6 rounded object-cover" />
                : <FileText className="h-4 w-4 text-blue-400 shrink-0" />
            }
            <span className="text-slate-300 truncate max-w-[100px] group-hover:text-white">{a.filename}</span>
            <span className="text-slate-500 shrink-0">{formatSize(a.size)}</span>
        </a>
    );
}

/* ═══ Main Widget ════════════════════════════════════════════ */
export default function FeedbackWidget() {
    const { data: session, status } = useSession();
    const [open, setOpen]                       = useState(false);
    const [view, setView]                       = useState<'list' | 'thread' | 'compose'>('list');
    const [threads, setThreads]                 = useState<Thread[]>([]);
    const [activeThread, setActiveThread]       = useState<Thread | null>(null);
    const [messages, setMessages]               = useState<Message[]>([]);
    const [category, setCategory]               = useState('GENERAL');
    const [priority, setPriority]               = useState('MEDIUM');
    const [text, setText]                       = useState('');
    const [pendingFiles, setPendingFiles]       = useState<File[]>([]);
    const [previews, setPreviews]               = useState<string[]>([]);
    const [uploading, setUploading]             = useState(false);
    const [sending, setSending]                 = useState(false);
    const [loadingThreads, setLoadingThreads]   = useState(false);

    const fileInputRef   = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollRef        = useRef<ReturnType<typeof setInterval> | null>(null);

    // NOTE: all hooks must be declared BEFORE any conditional returns (Rules of Hooks)

    /* ── Data fetching ───────────────────────────────────────── */
    const loadThreads = useCallback(async () => {
        setLoadingThreads(true);
        try {
            const res = await fetch('/api/feedback');
            if (res.ok) setThreads(await res.json());
        } finally {
            setLoadingThreads(false);
        }
    }, []);

    const loadMessages = useCallback(async (threadId: string) => {
        try {
            const res = await fetch(`/api/feedback/${threadId}/messages`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages ?? []);
                setActiveThread(data);
            }
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        if (open) loadThreads();
        if (!open) {
            if (pollRef.current) clearInterval(pollRef.current);
            setView('list');
        }
    }, [open, loadThreads]);

    // Poll for replies while thread is open
    useEffect(() => {
        if (view === 'thread' && activeThread) {
            pollRef.current = setInterval(() => loadMessages(activeThread.id), 15_000);
            return () => { if (pollRef.current) clearInterval(pollRef.current); };
        }
        if (pollRef.current) clearInterval(pollRef.current);
    }, [view, activeThread, loadMessages]);

    // Auto-scroll on new messages
    useEffect(() => {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }, [messages]);

    // Early return AFTER all hooks — conditionally hide the widget for unauthenticated users
    const user = session?.user as any;
    if (!user || status !== 'authenticated') return null;

    /* ── File handling ───────────────────────────────────────── */
    const handleFiles = (files: FileList | null) => {
        if (!files) return;
        const valid = Array.from(files).filter(f => f.size <= 5 * 1024 * 1024);
        setPendingFiles(prev => [...prev, ...valid.slice(0, 5 - prev.length)]);
        valid.forEach(f => {
            if (f.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = e => setPreviews(p => [...p, e.target?.result as string]);
                reader.readAsDataURL(f);
            } else {
                setPreviews(p => [...p, '']);
            }
        });
    };

    const removeFile = (idx: number) => {
        setPendingFiles(p => p.filter((_, i) => i !== idx));
        setPreviews(p => p.filter((_, i) => i !== idx));
    };

    /* ── Upload all pending files ────────────────────────────── */
    const uploadFiles = async (): Promise<Attachment[]> => {
        const results: Attachment[] = [];
        for (const file of pendingFiles) {
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch('/api/feedback/upload', { method: 'POST', body: fd });
            if (res.ok) results.push(await res.json());
        }
        return results;
    };

    /* ── Send / Create ───────────────────────────────────────── */
    const handleSend = async () => {
        if (!text.trim() && pendingFiles.length === 0) return;
        setSending(true);
        setUploading(pendingFiles.length > 0);
        try {
            const attachments = pendingFiles.length > 0 ? await uploadFiles() : [];
            setUploading(false);

            if (view === 'compose') {
                // Create new thread
                const res = await fetch('/api/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ category, priority, content: text, attachments }),
                });
                if (res.ok) {
                    const thread = await res.json();
                    setThreads(p => [thread, ...p]);
                    setText(''); setPendingFiles([]); setPreviews([]);
                    openThread(thread);
                    return;
                }
            }

            if (view === 'thread' && activeThread) {
                // Optimistic bubble
                const optimistic: Message = {
                    id: `opt-${Date.now()}`, content: text, isAdminReply: false,
                    createdAt: new Date().toISOString(), sender: { id: user.id, name: user.name },
                    attachments, isOptimistic: true,
                };
                setMessages(p => [...p, optimistic]);
                setText(''); setPendingFiles([]); setPreviews([]);

                const res = await fetch(`/api/feedback/${activeThread.id}/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: optimistic.content, attachments }),
                });
                if (res.ok) {
                    const saved = await res.json();
                    setMessages(p => p.map(m => m.id === optimistic.id ? { ...saved } : m));
                    loadThreads();
                }
            }
        } finally {
            setSending(false); setUploading(false);
        }
    };

    const openThread = (t: Thread) => {
        setActiveThread(t);
        setMessages(t.messages ?? []);
        setView('thread');
        loadMessages(t.id);
    };

    /* ── Unread badge: threads with admin replies ── */
    const unreadCount = threads.filter(t =>
        t.status !== 'RESOLVED' && t.status !== 'CLOSED' &&
        t.messages?.some(m => m.isAdminReply)
    ).length;

    const catInfo = CATEGORIES.find(c => c.id === category) ?? CATEGORIES[2];

    /* ══════════════════════════════════════════════════════════ */
    return (
        <>
            {/* ── Floating trigger button ── */}
            <motion.button
                onClick={() => setOpen(!open)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                className="fixed bottom-6 right-6 z-50 h-13 w-13 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/30 transition-colors"
                style={{ background: open ? '#1e293b' : 'linear-gradient(135deg,#2563eb,#1d4ed8)', border: '1px solid rgba(255,255,255,0.15)' }}
                title="Feedback & Support"
            >
                <AnimatePresence mode="wait">
                    {open
                        ? <motion.span key="x"  initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}><X className="h-5 w-5 text-slate-300" /></motion.span>
                        : <motion.span key="ic" initial={{ rotate: 90,  opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}><MessageSquarePlus className="h-5 w-5 text-white" /></motion.span>
                    }
                </AnimatePresence>
                {!open && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-lg">
                        {unreadCount}
                    </span>
                )}
            </motion.button>

            {/* ── Floating panel ── */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 24, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0,  scale: 1    }}
                        exit={{  opacity: 0, y: 24, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className="fixed bottom-24 right-6 z-50 w-96 rounded-2xl overflow-hidden flex flex-col"
                        style={{
                            height: '560px',
                            background: 'rgba(15,23,42,0.98)',
                            border: '1px solid rgba(255,255,255,0.10)',
                            backdropFilter: 'blur(24px)',
                            boxShadow: '0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
                        }}
                    >
                        {/* ── Panel Header ── */}
                        <div className="shrink-0 px-5 py-4 flex items-center justify-between"
                            style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.25) 0%, rgba(15,23,42,0) 100%)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <div className="flex items-center gap-3">
                                {view !== 'list' && (
                                    <button onClick={() => setView('list')}
                                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                )}
                                <div>
                                    <h3 className="text-sm font-black text-white tracking-tight">
                                        {view === 'thread' ? (activeThread?.title ?? 'Thread') : view === 'compose' ? 'New Feedback' : 'Feedback & Support'}
                                    </h3>
                                    <p className="text-[10px] text-slate-500 font-medium">
                                        {view === 'list' ? "We'd love to hear from you" : view === 'thread' ? `${STATUS_COLORS[activeThread?.status ?? 'OPEN'] ? activeThread?.status?.replace('_',' ') : 'Open'}` : 'Tell us what\'s on your mind'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {view === 'list' && (
                                    <button onClick={() => setView('compose')}
                                        className="p-1.5 rounded-lg text-blue-400 hover:text-white hover:bg-blue-500/20 transition-colors" title="New Feedback">
                                        <Plus className="h-4 w-4" />
                                    </button>
                                )}
                                <button onClick={() => setOpen(false)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* ─────────────── VIEW: LIST ─────────────────── */}
                        <AnimatePresence mode="wait">
                            {view === 'list' && (
                                <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto flex flex-col">
                                    {loadingThreads ? (
                                        <div className="flex-1 flex items-center justify-center">
                                            <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
                                        </div>
                                    ) : threads.length === 0 ? (
                                        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
                                            <div className="h-16 w-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                                <MessageSquarePlus className="h-8 w-8 text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">No feedback yet</p>
                                                <p className="text-xs text-slate-500 mt-1">Share a bug, idea, or question</p>
                                            </div>
                                            <button onClick={() => setView('compose')}
                                                className="px-5 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/25">
                                                Start a Thread
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                            {threads.map(t => {
                                                const catConf = CATEGORIES.find(c => c.id === t.category) ?? CATEGORIES[2];
                                                const lastMsg = t.messages?.[0];
                                                return (
                                                    <button key={t.id} onClick={() => openThread(t)}
                                                        className="w-full text-left p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-white/[0.07] hover:border-white/15 transition-all group">
                                                        <div className="flex items-start justify-between gap-2 mb-1.5">
                                                            <div className="flex items-center gap-2">
                                                                <catConf.Icon className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                                                                <span className="text-xs font-bold text-white truncate max-w-[160px]">{t.title}</span>
                                                            </div>
                                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[t.status] ?? 'bg-slate-700 text-slate-400'}`}>
                                                                {t.status.replace('_', ' ')}
                                                            </span>
                                                        </div>
                                                        {lastMsg && (
                                                            <p className="text-[11px] text-slate-500 line-clamp-1 pl-5">{lastMsg.content}</p>
                                                        )}
                                                        <div className="flex items-center justify-between mt-2 pl-5">
                                                            <span className={`text-[10px] font-bold ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                                                            <span className="text-[9px] text-slate-600">{new Date(t.updatedAt).toLocaleDateString('en-IN')}</span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div className="shrink-0 p-3 border-t border-white/[0.06]">
                                        <button onClick={() => setView('compose')}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-bold hover:bg-blue-600 hover:text-white transition-all">
                                            <Plus className="h-3.5 w-3.5" /> New Feedback Thread
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* ─────────────── VIEW: COMPOSE ──────────────── */}
                            {view === 'compose' && (
                                <motion.div key="compose" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col overflow-hidden">
                                    {/* Category tabs */}
                                    <div className="shrink-0 px-3 pt-3 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
                                        {CATEGORIES.map(c => (
                                            <button key={c.id} onClick={() => setCategory(c.id)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all shrink-0 ${
                                                    category === c.id
                                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                                        : 'bg-slate-800/60 text-slate-400 hover:text-white border border-white/10'
                                                }`}>
                                                <c.Icon className="h-3 w-3" /> {c.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Compose textarea */}
                                    <div className="flex-1 px-3 py-2">
                                        <textarea
                                            value={text}
                                            onChange={e => setText(e.target.value)}
                                            placeholder={`Describe your ${catInfo.label.toLowerCase()}...`}
                                            className="w-full h-full resize-none bg-slate-800/50 border border-white/10 rounded-xl p-3.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 font-medium leading-relaxed min-h-[180px]"
                                        />
                                    </div>

                                    {/* File previews */}
                                    {pendingFiles.length > 0 && (
                                        <div className="shrink-0 px-3 py-2 flex flex-wrap gap-2">
                                            {pendingFiles.map((f, i) => (
                                                <div key={i} className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-700/80 border border-white/10 text-xs max-w-[140px]">
                                                    {previews[i]
                                                        ? <img src={previews[i]} alt="" className="h-6 w-6 rounded object-cover shrink-0" />
                                                        : <FileText className="h-4 w-4 text-blue-400 shrink-0" />
                                                    }
                                                    <span className="text-slate-300 truncate">{f.name}</span>
                                                    <button onClick={() => removeFile(i)} className="text-slate-500 hover:text-rose-400 shrink-0 transition-colors ml-1">
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Action bar */}
                                    <div className="shrink-0 px-3 pb-3 flex items-center gap-2">
                                        <input ref={fileInputRef} type="file" multiple accept="*/*" className="hidden"
                                            onChange={e => handleFiles(e.target.files)} />
                                        <button onClick={() => fileInputRef.current?.click()}
                                            className="p-2 rounded-xl text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all" title="Attach file (max 5MB)">
                                            <Paperclip className="h-4.5 w-4.5" />
                                        </button>
                                        <select value={priority} onChange={e => setPriority(e.target.value)}
                                            className="flex-1 bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 focus:outline-none focus:border-blue-500/40">
                                            {PRIORITIES.map(p => <option key={p} value={p} className="bg-slate-800">{p}</option>)}
                                        </select>
                                        <button onClick={handleSend}
                                            disabled={sending || (!text.trim() && pendingFiles.length === 0)}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                                            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                            {uploading ? 'Uploading…' : sending ? 'Sending…' : 'Send'}
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-slate-600 text-center pb-2">Max 5MB per file · Replies within 24h</p>
                                </motion.div>
                            )}

                            {/* ─────────────── VIEW: THREAD ───────────────── */}
                            {view === 'thread' && (
                                <motion.div key="thread" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col overflow-hidden">
                                    {/* Thread meta pill */}
                                    {activeThread && (
                                        <div className="shrink-0 px-4 py-2 flex items-center gap-2 border-b border-white/[0.06]">
                                            {(() => { const C = CATEGORIES.find(c => c.id === activeThread.category) ?? CATEGORIES[2]; return <C.Icon className="h-3 w-3 text-slate-500" />; })()}
                                            <span className="text-[10px] text-slate-500 font-bold">{activeThread.category}</span>
                                            <span className="h-1 w-1 rounded-full bg-slate-700" />
                                            <span className={`text-[10px] font-bold ${PRIORITY_COLORS[activeThread.priority]}`}>{activeThread.priority}</span>
                                            <span className="ml-auto">
                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[activeThread.status] ?? ''}`}>
                                                    {activeThread.status.replace('_', ' ')}
                                                </span>
                                            </span>
                                        </div>
                                    )}

                                    {/* Messages */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                        {messages.length === 0 ? (
                                            <div className="flex items-center justify-center h-full">
                                                <span className="text-xs text-slate-600">No messages yet</span>
                                            </div>
                                        ) : messages.map((msg, idx) => {
                                            const isMe = !msg.isAdminReply;
                                            const showSender = idx === 0 || messages[idx - 1].isAdminReply !== msg.isAdminReply;
                                            return (
                                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                                                    <div className={`max-w-[80%] space-y-1 ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                                        {showSender && (
                                                            <span className="text-[10px] font-bold text-slate-500 px-1">
                                                                {isMe ? 'You' : (msg.sender?.name ?? 'Support')}
                                                            </span>
                                                        )}
                                                        <div className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                                                            isMe
                                                                ? 'bg-blue-600 text-white rounded-br-sm'
                                                                : 'bg-slate-700/80 text-slate-200 border border-white/10 rounded-bl-sm'
                                                        } ${msg.isOptimistic ? 'opacity-60' : ''}`}>
                                                            <p>{msg.content}</p>
                                                            {msg.attachments?.length > 0 && (
                                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                                    {msg.attachments.map((a, ai) => <AttachmentPreview key={ai} a={a} />)}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className={`flex items-center gap-1 px-1 ${isMe ? 'justify-end' : ''}`}>
                                                            <span className="text-[9px] text-slate-600">{formatTime(msg.createdAt)}</span>
                                                            {isMe && (msg.isOptimistic
                                                                ? <Check className="h-2.5 w-2.5 text-slate-600" />
                                                                : <CheckCheck className="h-2.5 w-2.5 text-blue-400" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Reply input — only if not resolved */}
                                    {activeThread?.status !== 'RESOLVED' && activeThread?.status !== 'CLOSED' ? (
                                        <>
                                            {/* File previews */}
                                            {pendingFiles.length > 0 && (
                                                <div className="shrink-0 px-3 pt-2 flex flex-wrap gap-1.5">
                                                    {pendingFiles.map((f, i) => (
                                                        <div key={i} className="relative flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-700/80 border border-white/10 text-[10px] max-w-[120px]">
                                                            {previews[i]
                                                                ? <img src={previews[i]} alt="" className="h-5 w-5 rounded object-cover shrink-0" />
                                                                : <FileText className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                                                            }
                                                            <span className="text-slate-400 truncate">{f.name}</span>
                                                            <button onClick={() => removeFile(i)} className="text-slate-600 hover:text-rose-400 ml-0.5 transition-colors">
                                                                <X className="h-2.5 w-2.5" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Compose row */}
                                            <div className="shrink-0 p-3 border-t border-white/[0.06] flex items-end gap-2">
                                                <input ref={fileInputRef} type="file" multiple accept="*/*" className="hidden"
                                                    onChange={e => handleFiles(e.target.files)} />
                                                <button onClick={() => fileInputRef.current?.click()}
                                                    className="p-2 rounded-xl text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all shrink-0">
                                                    <Paperclip className="h-4 w-4" />
                                                </button>
                                                <textarea
                                                    value={text}
                                                    onChange={e => setText(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                                    placeholder="Reply…  (Shift+Enter for new line)"
                                                    rows={1}
                                                    className="flex-1 resize-none bg-slate-800/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/40 font-medium leading-relaxed"
                                                    style={{ maxHeight: 100 }}
                                                />
                                                <button onClick={handleSend}
                                                    disabled={sending || (!text.trim() && pendingFiles.length === 0)}
                                                    className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-40 transition-all active:scale-95 shrink-0 shadow-lg shadow-blue-500/20">
                                                    {sending
                                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                                        : <Send className="h-4 w-4" />
                                                    }
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="shrink-0 p-3 border-t border-white/[0.06] text-center">
                                            <span className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
                                                <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
                                                This thread is {activeThread?.status?.toLowerCase()}
                                            </span>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
