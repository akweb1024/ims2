'use client';

import { useState, useRef } from 'react';
import {
    MessageSquare, Send, CheckCircle2, XCircle, Clock, AlertCircle,
    Trash2, User, Paperclip, X, FileText, Loader2, Image as ImageIcon
} from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';

/* ─── Types ─────────────────────────────────────────── */
interface Attachment { url: string; filename: string; size: number; mimeType: string; }

interface Suggestion {
    id: string;
    content: string;
    status: 'PENDING' | 'RESOLVED' | 'FAILED' | 'HOLD';
    authorName: string | null;
    authorEmail?: string | null;
    createdAt: string;
    userId: string | null;
    attachments?: Attachment[] | null;
    user?: {
        id: string;
        name: string;
        employeeProfile?: { profilePicture: string | null };
    };
}

interface Props {
    projectId: string;
    suggestions: Suggestion[];
    onUpdate: () => void;
    canManage: boolean;
}

/* ─── Helpers ───────────────────────────────────────── */
function fmtBytes(b: number): string {
    if (b < 1024)           return `${b}B`;
    if (b < 1024 * 1024)    return `${(b / 1024).toFixed(1)}KB`;
    return `${(b / (1024 * 1024)).toFixed(1)}MB`;
}

const STATUS_CONFIG = {
    RESOLVED: { label: 'Resolved', Icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    FAILED:   { label: 'Failed',   Icon: XCircle,      cls: 'bg-red-50 text-red-700 border-red-200'           },
    HOLD:     { label: 'On Hold',  Icon: Clock,         cls: 'bg-amber-50 text-amber-700 border-amber-200'     },
    PENDING:  { label: 'Pending',  Icon: AlertCircle,   cls: 'bg-slate-50 text-slate-600 border-slate-200'     },
} as const;

/* ─── Attachment pill ────────────────────────────────── */
function AttachPill({ a }: { a: Attachment }) {
    const isImg = a.mimeType.startsWith('image/');
    return (
        <a href={a.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary-50 border border-primary-100 hover:border-primary-300 transition-colors text-xs group max-w-[180px]">
            {isImg
                ? <img src={a.url} alt={a.filename} className="h-5 w-5 rounded object-cover shrink-0" />
                : <FileText className="h-3.5 w-3.5 text-primary-500 shrink-0" />
            }
            <span className="text-primary-700 font-medium truncate group-hover:text-primary-900">{a.filename}</span>
            <span className="text-primary-400 shrink-0">{fmtBytes(a.size)}</span>
        </a>
    );
}

/* ═══ Main Component ═════════════════════════════════ */
export default function ProjectSuggestions({ projectId, suggestions, onUpdate, canManage }: Props) {
    const [text, setText]               = useState('');
    const [files, setFiles]             = useState<File[]>([]);
    const [previews, setPreviews]       = useState<string[]>([]);
    const [uploading, setUploading]     = useState(false);
    const [submitting, setSubmitting]   = useState(false);
    const [updatingId, setUpdatingId]   = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    /* ── File picking ─────────────────────────────── */
    const handleFiles = (fileList: FileList | null) => {
        if (!fileList) return;
        const valid = Array.from(fileList).filter(f => f.size <= 10 * 1024 * 1024).slice(0, 5 - files.length);
        setFiles(prev => [...prev, ...valid]);
        valid.forEach(f => {
            if (f.type.startsWith('image/')) {
                const r = new FileReader();
                r.onload = e => setPreviews(p => [...p, e.target?.result as string]);
                r.readAsDataURL(f);
            } else {
                setPreviews(p => [...p, '']);
            }
        });
    };

    const removeFile = (i: number) => {
        setFiles(p => p.filter((_, idx) => idx !== i));
        setPreviews(p => p.filter((_, idx) => idx !== i));
    };

    /* ── Upload ───────────────────────────────────────── */
    const uploadAll = async (): Promise<Attachment[]> => {
        const out: Attachment[] = [];
        for (const file of files) {
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch('/api/feedback/upload', { method: 'POST', body: fd });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: `Upload failed (${res.status})` }));
                throw new Error(err.error ?? `Upload failed for ${file.name}`);
            }
            out.push(await res.json());
        }
        return out;
    };

    /* ── Submit ───────────────────────────────────────── */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() && files.length === 0) return;
        setSubmitting(true);
        setUploading(files.length > 0);
        try {
            const attachments = files.length > 0 ? await uploadAll() : [];
            setUploading(false);
            const res = await fetch(`/api/it/projects/${projectId}/suggestions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: text, attachments }),
            });
            if (res.ok) {
                setText(''); setFiles([]); setPreviews([]);
                onUpdate();
            } else {
                const errBody = await res.json().catch(() => ({ error: `Server error (${res.status})` }));
                console.error('Suggestion submit failed:', errBody);
                alert(errBody.error ?? 'Failed to submit. Please try again.');
            }
        } catch (err: any) {
            console.error('Suggestion submit error:', err);
            alert(err?.message ?? 'An unexpected error occurred. Please try again.');
        } finally {
            setSubmitting(false); setUploading(false);
        }
    };

    const handleStatus = async (id: string, status: string) => {
        setUpdatingId(id);
        try {
            const res = await fetch(`/api/it/projects/${projectId}/suggestions/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (res.ok) onUpdate();
        } finally { setUpdatingId(null); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this feedback entry?')) return;
        const res = await fetch(`/api/it/projects/${projectId}/suggestions/${id}`, { method: 'DELETE' });
        if (res.ok) onUpdate();
    };

    /* ── Render ───────────────────────────────────── */
    return (
        <div className="space-y-5">
            {/* ── Compose card ── */}
            <div className="card-premium">
                <h3 className="text-base font-bold text-secondary-900 mb-4 flex items-center gap-2">
                    <MessageSquare className="h-4.5 w-4.5 text-primary-500" />
                    Project Suggestions &amp; Feedback
                </h3>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    {/* Textarea */}
                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="Have a suggestion or found a bug? Tell us here…"
                        className="input-premium resize-none min-h-[100px] text-sm"
                        disabled={submitting}
                    />

                    {/* Staged file chips */}
                    {files.length > 0 && (
                        <div className="flex flex-wrap gap-2 px-1">
                            {files.map((f, i) => (
                                <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary-50 border border-primary-100 text-xs max-w-[160px]">
                                    {previews[i]
                                        ? <img src={previews[i]} alt="" className="h-5 w-5 rounded object-cover shrink-0" />
                                        : <FileText className="h-3.5 w-3.5 text-primary-500 shrink-0" />
                                    }
                                    <span className="text-primary-700 font-medium truncate">{f.name}</span>
                                    <button type="button" onClick={() => removeFile(i)}
                                        className="text-primary-300 hover:text-red-500 transition-colors ml-0.5 shrink-0">
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Action bar */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            {/* Attach */}
                            <input ref={fileInputRef} type="file" multiple accept="*/*" className="hidden"
                                onChange={e => handleFiles(e.target.files)} />
                            <button type="button" onClick={() => fileInputRef.current?.click()}
                                disabled={submitting || files.length >= 5}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-secondary-500 hover:text-primary-600 hover:bg-primary-50 border border-secondary-100 hover:border-primary-200 transition-all disabled:opacity-40">
                                <Paperclip className="h-3.5 w-3.5" />
                                Attach {files.length > 0 ? `(${files.length}/5)` : 'File'}
                            </button>
                            <span className="text-[10px] text-secondary-300">Max 10MB each</span>
                        </div>

                        <button type="submit"
                            disabled={submitting || (!text.trim() && files.length === 0)}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary-600 text-white text-xs font-bold rounded-xl hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow hover:shadow-primary-500/20 active:scale-95">
                            {uploading
                                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…</>
                                : submitting
                                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</>
                                    : <><Send className="h-3.5 w-3.5" /> Submit</>
                            }
                        </button>
                    </div>
                </form>
            </div>

            {/* ── Suggestion list ── */}
            <div className="space-y-3">
                {suggestions.length === 0 ? (
                    <div className="card-premium py-12 text-center text-secondary-400">
                        <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-medium">No feedback yet. Be the first!</p>
                    </div>
                ) : suggestions.map(s => {
                    const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.PENDING;
                    const SIcon = cfg.Icon;
                    const atts = (s.attachments as Attachment[] | null) ?? [];
                    return (
                        <div key={s.id}
                            className="card-premium group transition-all hover:border-primary-200 hover:shadow-md">
                            <div className="flex gap-3">
                                {/* Avatar */}
                                <div className="shrink-0">
                                    {s.user?.employeeProfile?.profilePicture ? (
                                        <Image src={s.user.employeeProfile.profilePicture}
                                            alt={s.user.name} width={38} height={38}
                                            className="h-9 w-9 rounded-xl object-cover ring-2 ring-secondary-100" />
                                    ) : (
                                        <div className="h-9 w-9 rounded-xl bg-primary-50 flex items-center justify-center">
                                            <User className="h-4.5 w-4.5 text-primary-400" />
                                        </div>
                                    )}
                                </div>

                                {/* Body */}
                                <div className="flex-1 min-w-0">
                                    {/* Header row */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-secondary-900">
                                                {s.user?.name || s.authorName || 'Guest'}
                                            </span>
                                            <span className="text-xs text-secondary-400">
                                                {format(new Date(s.createdAt), 'MMM d, yyyy · h:mm a')}
                                            </span>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${cfg.cls}`}>
                                            <SIcon className="h-3 w-3" /> {cfg.label}
                                        </span>
                                    </div>

                                    {/* Content */}
                                    <p className="text-sm text-secondary-700 leading-relaxed whitespace-pre-wrap">{s.content}</p>

                                    {/* Attachments */}
                                    {atts.length > 0 && (
                                        <div className="mt-2.5 flex flex-wrap gap-2">
                                            {atts.map((a, ai) => <AttachPill key={ai} a={a} />)}
                                        </div>
                                    )}

                                    {/* Admin actions */}
                                    {canManage && (
                                        <div className="mt-3 pt-3 border-t border-secondary-50 flex flex-wrap items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-[10px] font-bold text-secondary-300 uppercase tracking-widest mr-auto">Status:</span>
                                            {(['RESOLVED', 'HOLD', 'FAILED'] as const).map(st => {
                                                const c = STATUS_CONFIG[st];
                                                const CI = c.Icon;
                                                const active = s.status === st;
                                                return (
                                                    <button key={st}
                                                        onClick={() => handleStatus(s.id, st)}
                                                        disabled={updatingId === s.id}
                                                        title={`Mark ${c.label}`}
                                                        className={`p-1.5 rounded-lg border transition-colors disabled:opacity-50 ${active ? c.cls : 'border-transparent text-secondary-400 hover:bg-secondary-50'}`}>
                                                        <CI className="h-3.5 w-3.5" />
                                                    </button>
                                                );
                                            })}
                                            <div className="w-px h-4 bg-secondary-100 mx-0.5" />
                                            <button onClick={() => handleDelete(s.id)}
                                                className="p-1.5 rounded-lg text-secondary-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                title="Delete">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
