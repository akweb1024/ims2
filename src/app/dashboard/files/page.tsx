'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import NextImage from 'next/image';
import {
    Upload, FolderOpen, Search, Trash2, Download, Eye, RefreshCw,
    File, FileText, Image as Img, Film, Music, Package, X, Check,
    CloudUpload, Loader2, AlertCircle, Grid3X3, List, Filter,
    HardDrive, Database, Wifi
} from 'lucide-react';
import { format } from 'date-fns';

/* ─── Types ─────────────────────────────────────────── */
interface FileRecord {
    id: string;
    filename: string;
    url: string;
    mimeType: string;
    size: number;
    category: string;
    context: string | null;
    checksum: string | null;
    syncedAt: string | null;
    createdAt: string;
    uploadedBy?: { id: string; name: string; email: string } | null;
}

const CATEGORIES = [
    { value: '', label: 'All Files' },
    { value: 'general', label: 'General' },
    { value: 'documents', label: 'Documents' },
    { value: 'feedback', label: 'Feedback' },
    { value: 'profile_pictures', label: 'Profile Pics' },
    { value: 'publications', label: 'Publications' },
    { value: 'proofs', label: 'Proofs' },
    { value: 'other', label: 'Other' },
];

/* ─── Helpers ───────────────────────────────────────── */
function fmtBytes(b: number): string {
    if (b < 1024)        return `${b} B`;
    if (b < 1048576)     return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1048576).toFixed(1)} MB`;
}

function FileIcon({ mimeType, className = 'h-8 w-8' }: { mimeType: string; className?: string }) {
    if (mimeType.startsWith('image/')) return <Img className={`${className} text-blue-400`} />;
    if (mimeType.startsWith('video/')) return <Film className={`${className} text-purple-400`} />;
    if (mimeType.startsWith('audio/')) return <Music className={`${className} text-pink-400`} />;
    if (mimeType.includes('pdf'))      return <FileText className={`${className} text-red-400`} />;
    if (mimeType.includes('word') || mimeType.includes('document'))
        return <FileText className={`${className} text-blue-500`} />;
    if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv'))
        return <FileText className={`${className} text-green-500`} />;
    if (mimeType.includes('zip') || mimeType.includes('archive'))
        return <Package className={`${className} text-amber-400`} />;
    return <File className={`${className} text-slate-400`} />;
}

function CategoryBadge({ category }: { category: string }) {
    const colors: Record<string, string> = {
        feedback:         'bg-indigo-900/40 text-indigo-300 border-indigo-700/40',
        documents:        'bg-sky-900/40 text-sky-300 border-sky-700/40',
        profile_pictures: 'bg-teal-900/40 text-teal-300 border-teal-700/40',
        publications:     'bg-violet-900/40 text-violet-300 border-violet-700/40',
        proofs:           'bg-orange-900/40 text-orange-300 border-orange-700/40',
        general:          'bg-slate-800/60 text-slate-300 border-slate-600/40',
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${colors[category] ?? colors.general}`}>
            {category.replace('_', ' ')}
        </span>
    );
}

/* ═══ Main Page ═════════════════════════════════════ */
export default function FilesPage() {
    const [files, setFiles]           = useState<FileRecord[]>([]);
    const [total, setTotal]           = useState(0);
    const [page, setPage]             = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading]       = useState(true);
    const [search, setSearch]         = useState('');
    const [category, setCategory]     = useState('');
    const [myOnly, setMyOnly]         = useState(false);
    const [view, setView]             = useState<'grid' | 'list'>('grid');

    // Upload state
    const [dragOver, setDragOver]     = useState(false);
    const [uploadFiles, setUploadFiles] = useState<File[]>([]);
    const [uploading, setUploading]   = useState(false);
    const [uploadResults, setUploadResults] = useState<{ name: string; ok: boolean; msg: string }[]>([]);

    // Admin sync
    const [syncing, setSyncing]       = useState(false);
    const [syncResult, setSyncResult] = useState<string | null>(null);

    // Delete confirmation
    const [deleteId, setDeleteId]     = useState<string | null>(null);
    const [deleting, setDeleting]     = useState(false);

    // Preview
    const [preview, setPreview]       = useState<FileRecord | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    /* ── Fetch ──────────────────────────────────────── */
    const fetchFiles = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(p), limit: '24',
                ...(category && { category }),
                ...(search   && { search }),
                ...(myOnly   && { myOnly: 'true' }),
            });
            const res = await fetch(`/api/files/records?${params}`);
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            setFiles(data.files);
            setTotal(data.total);
            setTotalPages(data.totalPages);
            setPage(p);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [category, search, myOnly]);

    useEffect(() => { fetchFiles(1); }, [fetchFiles]);

    /* ── Upload ─────────────────────────────────────── */
    const handleUpload = async () => {
        if (!uploadFiles.length) return;
        setUploading(true);
        setUploadResults([]);
        const results: typeof uploadResults = [];
        for (const f of uploadFiles) {
            const fd = new FormData();
            fd.append('file', f);
            fd.append('category', 'general');
            try {
                const res = await fetch('/api/upload', { method: 'POST', body: fd });
                const body = await res.json();
                results.push({ name: f.name, ok: res.ok, msg: res.ok ? 'Uploaded' : body.error ?? 'Failed' });
            } catch {
                results.push({ name: f.name, ok: false, msg: 'Network error' });
            }
        }
        setUploadResults(results);
        setUploading(false);
        const allOk = results.every(r => r.ok);
        if (allOk) {
            setUploadFiles([]);
            setTimeout(() => { setUploadResults([]); fetchFiles(1); }, 1500);
        }
    };

    const onDropFiles = (e: React.DragEvent) => {
        e.preventDefault(); setDragOver(false);
        const dropped = Array.from(e.dataTransfer.files);
        setUploadFiles(prev => [...prev, ...dropped]);
    };

    /* ── Delete ─────────────────────────────────────── */
    const confirmDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/files/records/${deleteId}`, { method: 'DELETE' });
            if (res.ok) { setDeleteId(null); fetchFiles(page); }
            else alert((await res.json()).error ?? 'Delete failed');
        } finally { setDeleting(false); }
    };

    /* ── Sync ───────────────────────────────────────── */
    const triggerSync = async () => {
        setSyncing(true); setSyncResult(null);
        try {
            const res = await fetch('/api/files/sync', { method: 'POST' });
            const body = await res.json();
            setSyncResult(body.message ?? JSON.stringify(body));
            if (res.ok) fetchFiles(1);
        } finally { setSyncing(false); }
    };

    /* ─── Render ─────────────────────────────────────── */
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-2">
                        <HardDrive className="h-6 w-6 text-blue-400" /> File Manager
                    </h1>
                    <p className="text-slate-400 text-sm mt-0.5">
                        {total} file{total !== 1 ? 's' : ''} stored · Unified storage across all modules
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={triggerSync} disabled={syncing}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-blue-500/50 transition-all text-sm font-semibold disabled:opacity-50">
                        {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                        Sync Storage
                    </button>
                    <button onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all shadow-lg shadow-blue-900/30 active:scale-95">
                        <CloudUpload className="h-4 w-4" /> Upload Files
                    </button>
                    <input ref={fileInputRef} type="file" multiple className="hidden"
                        onChange={e => setUploadFiles(prev => [...prev, ...Array.from(e.target.files ?? [])])} />
                </div>
            </div>

            {/* Sync result banner */}
            {syncResult && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-900/30 border border-blue-700/40 text-blue-300 text-sm">
                    <Database className="h-4 w-4 shrink-0" />
                    <span>{syncResult}</span>
                    <button onClick={() => setSyncResult(null)} className="ml-auto text-blue-400 hover:text-white"><X className="h-4 w-4" /></button>
                </div>
            )}

            {/* Upload drop zone */}
            {uploadFiles.length > 0 && (
                <div className="rounded-2xl bg-slate-900/80 border border-slate-700/50 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-300">{uploadFiles.length} file{uploadFiles.length !== 1 ? 's' : ''} ready to upload</span>
                        <button onClick={() => { setUploadFiles([]); setUploadResults([]); }}
                            className="text-slate-500 hover:text-red-400 transition-colors"><X className="h-4 w-4" /></button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {uploadFiles.map((f, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300">
                                <FileIcon mimeType={f.type} className="h-3.5 w-3.5" />
                                <span className="max-w-[120px] truncate">{f.name}</span>
                                <span className="text-slate-500">{fmtBytes(f.size)}</span>
                                {uploadResults.find(r => r.name === f.name) && (
                                    uploadResults.find(r => r.name === f.name)!.ok
                                        ? <Check className="h-3 w-3 text-emerald-400" />
                                        : <AlertCircle className="h-3 w-3 text-red-400" />
                                )}
                            </div>
                        ))}
                    </div>
                    {uploadResults.some(r => !r.ok) && (
                        <div className="text-xs text-red-400 space-y-1">
                            {uploadResults.filter(r => !r.ok).map(r => (
                                <div key={r.name} className="flex items-center gap-1.5">
                                    <AlertCircle className="h-3 w-3 shrink-0" />
                                    <span>{r.name}: {r.msg}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <button onClick={handleUpload} disabled={uploading}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all disabled:opacity-50 active:scale-95">
                        {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</> : <><Upload className="h-4 w-4" /> Upload All</>}
                    </button>
                </div>
            )}

            {/* Drag zone hint when no staged files */}
            {uploadFiles.length === 0 && (
                <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={onDropFiles}
                    onClick={() => fileInputRef.current?.click()}
                    className={`rounded-2xl border-2 border-dashed py-8 text-center cursor-pointer transition-all ${
                        dragOver ? 'border-blue-500 bg-blue-900/20' : 'border-slate-700/60 hover:border-blue-600/40 hover:bg-slate-800/30'
                    }`}
                >
                    <CloudUpload className={`h-10 w-10 mx-auto mb-2 ${dragOver ? 'text-blue-400' : 'text-slate-600'}`} />
                    <p className={`text-sm font-semibold ${dragOver ? 'text-blue-300' : 'text-slate-500'}`}>
                        Drop files here, or click to browse
                    </p>
                    <p className="text-xs text-slate-600 mt-1">Up to 50MB per file · Any format</p>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search by filename…"
                        className="w-full bg-slate-900/80 border border-slate-700/60 text-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500/50 placeholder:text-slate-600" />
                </div>
                {/* Category select */}
                <select value={category} onChange={e => setCategory(e.target.value)}
                    className="bg-slate-900/80 border border-slate-700/60 text-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50">
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                {/* My only toggle */}
                <button onClick={() => setMyOnly(p => !p)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold transition-all ${
                        myOnly ? 'bg-blue-900/40 border-blue-600/50 text-blue-300' : 'bg-slate-900/80 border-slate-700/60 text-slate-400 hover:text-slate-200'
                    }`}>
                    <Filter className="h-3.5 w-3.5" /> My Files
                </button>
                {/* View toggle */}
                <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-700/60 rounded-xl p-1">
                    {([['grid', Grid3X3], ['list', List]] as const).map(([v, Icon]) => (
                        <button key={v} onClick={() => setView(v as 'grid' | 'list')}
                            className={`p-1.5 rounded-lg transition-all ${view === v ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>
                            <Icon className="h-3.5 w-3.5" />
                        </button>
                    ))}
                </div>
                <button onClick={() => fetchFiles(1)} className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors">
                    <RefreshCw className="h-4 w-4" />
                </button>
            </div>

            {/* File Grid/List */}
            {loading ? (
                <div className="flex items-center justify-center py-24 text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : files.length === 0 ? (
                <div className="rounded-2xl bg-slate-900/40 border border-slate-800/60 py-20 text-center text-slate-500 space-y-2">
                    <FolderOpen className="h-14 w-14 mx-auto opacity-20" />
                    <p className="text-sm font-medium">No files found</p>
                    <p className="text-xs">Upload files or clear your filters</p>
                </div>
            ) : view === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {files.map(f => (
                        <div key={f.id}
                            className="group relative rounded-2xl bg-slate-900/60 border border-slate-800/60 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-900/10 transition-all p-4 flex flex-col items-center text-center gap-2 cursor-pointer"
                            onClick={() => setPreview(f)}>
                            {/* Thumbnail or icon */}
                            {f.mimeType.startsWith('image/') ? (
                                <NextImage src={f.url} alt={f.filename} width={64} height={64}
                                    className="h-16 w-16 rounded-xl object-cover ring-2 ring-slate-700/50 group-hover:ring-blue-500/30 transition-all" />
                            ) : (
                                <div className="h-16 w-16 rounded-xl bg-slate-800 flex items-center justify-center ring-2 ring-slate-700/50 group-hover:ring-blue-500/30 transition-all">
                                    <FileIcon mimeType={f.mimeType} className="h-8 w-8" />
                                </div>
                            )}
                            <p className="text-xs text-slate-300 font-medium truncate w-full">{f.filename}</p>
                            <CategoryBadge category={f.category} />
                            <p className="text-[10px] text-slate-600">{fmtBytes(f.size)}</p>

                            {/* Hover actions */}
                            <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a href={f.url} download={f.filename} onClick={e => e.stopPropagation()}
                                    className="p-1 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-400 hover:text-white transition-all shadow">
                                    <Download className="h-3 w-3" />
                                </a>
                                <button onClick={e => { e.stopPropagation(); setDeleteId(f.id); }}
                                    className="p-1 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white transition-all shadow">
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-2xl bg-slate-900/60 border border-slate-800/60 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-800/80">
                                {['File', 'Category', 'Size', 'Uploaded', 'Sync', ''].map(h => (
                                    <th key={h} className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {files.map((f, i) => (
                                <tr key={f.id}
                                    className={`border-b border-slate-800/40 hover:bg-slate-800/40 transition-colors cursor-pointer ${i % 2 === 0 ? '' : 'bg-slate-900/20'}`}
                                    onClick={() => setPreview(f)}>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <FileIcon mimeType={f.mimeType} className="h-5 w-5 shrink-0" />
                                            <span className="text-slate-200 font-medium truncate max-w-[200px]">{f.filename}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3"><CategoryBadge category={f.category} /></td>
                                    <td className="px-4 py-3 text-slate-400 text-xs">{fmtBytes(f.size)}</td>
                                    <td className="px-4 py-3 text-slate-400 text-xs">
                                        <div>{format(new Date(f.createdAt), 'MMM d, yyyy')}</div>
                                        <div className="text-slate-600">{f.uploadedBy?.name ?? '—'}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {f.syncedAt
                                            ? <span className="inline-flex items-center gap-1 text-emerald-400 text-xs"><Check className="h-3 w-3" /> Synced</span>
                                            : <span className="inline-flex items-center gap-1 text-amber-400 text-xs"><AlertCircle className="h-3 w-3" /> Stale</span>
                                        }
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2 justify-end" onClick={e => e.stopPropagation()}>
                                            <a href={f.url} download={f.filename}
                                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-900/20 transition-colors">
                                                <Download className="h-3.5 w-3.5" />
                                            </a>
                                            <button onClick={() => setDeleteId(f.id)}
                                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-900/20 transition-colors">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button onClick={() => fetchFiles(page - 1)} disabled={page <= 1}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white text-sm disabled:opacity-40 transition-all">← Prev</button>
                    <span className="text-slate-500 text-sm">Page {page} / {totalPages}</span>
                    <button onClick={() => fetchFiles(page + 1)} disabled={page >= totalPages}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white text-sm disabled:opacity-40 transition-all">Next →</button>
                </div>
            )}

            {/* ── Preview Modal ── */}
            {preview && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
                    onClick={() => setPreview(null)}>
                    <div className="bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <FileIcon mimeType={preview.mimeType} className="h-10 w-10" />
                                <div>
                                    <p className="font-bold text-white text-sm break-all">{preview.filename}</p>
                                    <p className="text-slate-500 text-xs">{fmtBytes(preview.size)}</p>
                                </div>
                            </div>
                            <button onClick={() => setPreview(null)} className="text-slate-600 hover:text-white"><X className="h-5 w-5" /></button>
                        </div>

                        {preview.mimeType.startsWith('image/') && (
                            <NextImage src={preview.url} alt={preview.filename} width={512} height={256}
                                className="w-full max-h-64 object-contain rounded-xl bg-slate-800" />
                        )}

                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <p className="text-slate-600 font-medium mb-0.5">Category</p>
                                <CategoryBadge category={preview.category} />
                            </div>
                            {([
                                ['Uploaded', format(new Date(preview.createdAt), 'MMM d, yyyy · h:mm a')],
                                ['By',       preview.uploadedBy?.name ?? '—'],
                                ['Context',  preview.context ?? '—'],
                                ['MD5',      preview.checksum ? `${preview.checksum.slice(0, 16)}…` : '—'],
                                ['Sync',     preview.syncedAt ? `✓ ${format(new Date(preview.syncedAt), 'MMM d')}` : '⚠ Stale'],
                            ] as [string, string][]).map(([label, val]) => (
                                <div key={label}>
                                    <p className="text-slate-600 font-medium mb-0.5">{label}</p>
                                    <p className="text-slate-300">{val}</p>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2 pt-1">
                            <a href={preview.url} download={preview.filename}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all flex-1 justify-center">
                                <Download className="h-4 w-4" /> Download
                            </a>
                            <a href={preview.url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-all">
                                <Eye className="h-4 w-4" />
                            </a>
                            <button onClick={() => { setPreview(null); setDeleteId(preview.id); }}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-900/40 hover:bg-red-800/60 text-red-300 text-sm transition-all">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete confirmation modal ── */}
            {deleteId && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="bg-slate-900 border border-red-900/60 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 text-center">
                        <div className="h-12 w-12 rounded-full bg-red-900/30 flex items-center justify-center mx-auto">
                            <Trash2 className="h-6 w-6 text-red-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold">Delete File?</h3>
                            <p className="text-slate-400 text-sm mt-1">This permanently removes the file from disk and database.</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteId(null)} disabled={deleting}
                                className="flex-1 px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 transition-all">Cancel</button>
                            <button onClick={confirmDelete} disabled={deleting}
                                className="flex-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-all disabled:opacity-50">
                                {deleting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
