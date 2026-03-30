'use client';

import { useDeferredValue, useMemo, useState, type FormEvent } from 'react';
import { showSuccess, showError } from '@/lib/toast';

type Props = {
    user: any;
    categories: Array<{ value: string; label: string }>;
    governance: any;
    partnerOptions: Array<{ id: string; name?: string | null; email?: string | null; designation?: string | null }>;
    refresh: () => Promise<void>;
    onSubmitted?: () => void;
};

export default function IdeaSubmissionForm({ user, categories, governance, partnerOptions, refresh, onSubmitted }: Props) {
    const [form, setForm] = useState({
        topic: '',
        description: '',
        category: 'PUBLICATION',
        partnerIds: [] as string[],
        duplicateDecision: '',
        mergeTargetIdeaId: '',
    });
    const [attachments, setAttachments] = useState<Array<{ url: string; filename: string; mimeType: string; size: number; fileRecordId?: string | null; scrubStatus?: string | null }>>([]);
    const [duplicates, setDuplicates] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
    const [partnerSearch, setPartnerSearch] = useState('');
    const deferredPartnerSearch = useDeferredValue(partnerSearch);

    const availablePartners = useMemo(() => {
        const query = deferredPartnerSearch.trim().toLowerCase();
        return partnerOptions
            .filter((option) => option.id !== user?.id && !form.partnerIds.includes(option.id))
            .filter((option) => {
                if (!query) return true;
                const haystack = [
                    option.name,
                    option.email,
                    option.designation,
                    option.id,
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                return haystack.includes(query);
            })
            .slice(0, 8);
    }, [deferredPartnerSearch, form.partnerIds, partnerOptions, user?.id]);

    const uploadAttachment = async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch('/api/think-tank/upload', {
            method: 'POST',
            body: formData,
        });

        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Upload failed');
        return payload;
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        setSubmitting(true);

        try {
            const response = await fetch('/api/think-tank/ideas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: form.topic,
                    description: form.description,
                    category: form.category,
                    partnerIds: form.partnerIds,
                    attachments,
                    duplicateDecision: form.duplicateDecision || undefined,
                    mergeTargetIdeaId: form.mergeTargetIdeaId || undefined,
                }),
            });
            const payload = await response.json();

            if (response.status === 409 && payload.requiresDecision) {
                setDuplicates(payload.duplicates || []);
                setError('Potential duplicate detected. Review the matched ideas below, then choose Merge or Proceed as Unique.');
                return;
            }

            if (!response.ok) {
                throw new Error(payload.error || 'Failed to submit idea.');
            }

            setForm({
                topic: '',
                description: '',
                category: 'PUBLICATION',
                partnerIds: [],
                duplicateDecision: '',
                mergeTargetIdeaId: '',
            });
            setAttachments([]);
            setDuplicates([]);
            
            showSuccess(payload.merged ? 'Idea merged successfully' : 'Initiative Registered Successfully');
            await refresh();
            setShowSuccessOverlay(true);
            window.setTimeout(() => {
                setShowSuccessOverlay(false);
                setSubmitting(false);
                onSubmitted?.();
            }, 1800);
        } catch (submitError: any) {
            showError(submitError.message || 'Failed to submit idea.');
            setError(submitError.message || 'Failed to submit idea.');
        } finally {
            if (!showSuccessOverlay) {
                setSubmitting(false);
            }
        }
    };

    return (
        <div className="border-4 border-slate-950 bg-white p-8 relative overflow-hidden">
            {/* Bauhaus Success Overlay */}
            {showSuccessOverlay && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-500">
                    <div className="relative p-12 bg-white border-8 border-[#FF4500] max-w-lg w-full text-center overflow-hidden tt-fade-up">
                        <div className="absolute top-0 left-0 w-full h-2 bg-[#FF4500]" />
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#FF4500] rotate-45" />
                        <div className="absolute -bottom-8 -left-8 w-24 h-24 border-4 border-slate-950 rounded-full" />
                        
                        <h2 className="text-6xl font-black uppercase tracking-tighter leading-none italic text-slate-950">
                            MISSION<br/>
                            <span className="text-[#FF4500]">DEPLOYED</span>
                        </h2>
                        
                        <div className="mt-8 flex items-center justify-center gap-4">
                            <div className="h-0.5 w-12 bg-slate-950" />
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-950">Framework 1.0 Verified</p>
                            <div className="h-0.5 w-12 bg-slate-950" />
                        </div>
                        
                        <div className="mt-10 flex justify-center gap-3">
                            <div className="w-4 h-4 bg-slate-950 animate-bounce [animation-delay:-0.3s]" />
                            <div className="w-4 h-4 bg-[#FF4500] animate-bounce [animation-delay:-0.15s]" />
                            <div className="w-4 h-4 bg-slate-950 animate-bounce" />
                        </div>
                        
                        <p className="mt-8 text-[10px] font-bold uppercase tracking-widest text-slate-400 animate-pulse">
                            Synchronizing Global Registry...
                        </p>
                    </div>
                </div>
            )}

            <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF4500] translate-x-12 -translate-y-12 rotate-45" />
            <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-950">Draft <br/> Proposal</h2>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.3em] text-[#FF4500]">Innovation Framework 1.0</p>
            
            <form onSubmit={handleSubmit} className="mt-10 space-y-8">
                {error && (
                    <div className="border-2 border-red-500 bg-red-50 p-4 text-xs font-bold text-red-600 uppercase tracking-widest">
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Core Topic</label>
                    <input
                        className="w-full border-b-2 border-slate-950 bg-transparent px-0 py-4 text-2xl font-black placeholder:text-slate-200 focus:border-[#FF4500] focus:outline-none transition-colors"
                        placeholder="CONCEPT NAME"
                        value={form.topic}
                        onChange={(event) => setForm((current) => ({ ...current, topic: event.target.value }))}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Implementation Logic (Markdown)</label>
                    <textarea
                        className="w-full min-h-[250px] border-2 border-slate-950 bg-slate-50 p-6 font-mono text-sm placeholder:text-slate-300 focus:border-[#FF4500] focus:outline-none transition-colors"
                        placeholder="Explain the problem, solution, and impact..."
                        value={form.description}
                        onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                        required
                    />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Impact Domain</label>
                        <select
                            className="w-full border-2 border-slate-950 bg-white px-4 py-4 font-black uppercase tracking-widest text-xs appearance-none cursor-pointer focus:border-[#FF4500] focus:outline-none"
                            value={form.category}
                            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                        >
                            {categories.map((cat) => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Partners</label>
                        <div className="border-2 border-slate-950 bg-white">
                            <input
                                className="w-full border-b-2 border-slate-200 px-4 py-4 font-black text-xs uppercase tracking-widest placeholder:text-slate-300 focus:border-[#FF4500] focus:outline-none"
                                placeholder={form.partnerIds.length >= 3 ? 'Partner limit reached' : 'Search by name, email, or designation'}
                                value={partnerSearch}
                                onChange={(event) => setPartnerSearch(event.target.value)}
                                disabled={form.partnerIds.length >= 3}
                            />
                            <div className="max-h-56 overflow-y-auto">
                                {form.partnerIds.length >= 3 ? (
                                    <div className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                        You can select up to 3 partners
                                    </div>
                                ) : availablePartners.length > 0 ? (
                                    availablePartners.map((option) => (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => {
                                                setForm((current) => ({
                                                    ...current,
                                                    partnerIds: [...current.partnerIds, option.id].slice(0, 3),
                                                }));
                                                setPartnerSearch('');
                                            }}
                                            className="flex w-full items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-[#FF4500]/5"
                                        >
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-950">
                                                    {option.name || option.email || option.id}
                                                </div>
                                                <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                                    {option.email || option.id}
                                                    {option.designation ? ` • ${option.designation}` : ''}
                                                </div>
                                            </div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-[#FF4500]">
                                                Add
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                        No matching partner found
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {form.partnerIds.length > 0 ? form.partnerIds.map((partnerId) => {
                                const partner = partnerOptions.find((option) => option.id === partnerId);
                                return (
                                    <button
                                        key={partnerId}
                                        type="button"
                                        onClick={() => setForm((current) => ({
                                            ...current,
                                            partnerIds: current.partnerIds.filter((id) => id !== partnerId),
                                        }))}
                                        className="border-2 border-slate-950 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wide hover:bg-slate-950 hover:text-white"
                                    >
                                        {partner?.name || partner?.email || partnerId}
                                        {partner?.designation ? ` • ${partner.designation}` : ''}
                                        {' x'}
                                    </button>
                                );
                            }) : (
                                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    No partners selected
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Supplemental Assets</label>
                    <div className="relative group">
                        <input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            onChange={async (event) => {
                                const file = event.target.files?.[0];
                                if (!file) return;
                                try {
                                    const uploaded = await uploadAttachment(file);
                                    setAttachments((current) => [...current, uploaded]);
                                } catch (err: any) {
                                    setError(err.message || 'Upload failed.');
                                }
                            }}
                        />
                        <div className="border-2 border-dashed border-slate-300 p-8 text-center transition-all group-hover:border-[#FF4500] group-hover:bg-[#FF4500]/5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-[#FF4500]">Click or Drag to Upload</p>
                        </div>
                    </div>
                    {attachments.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {attachments.map((file) => (
                                <div key={file.url} className="flex items-center justify-between border-2 border-slate-950 p-4 bg-white">
                                    <span className="text-[10px] font-black uppercase tracking-tight truncate max-w-[200px]">{file.filename}</span>
                                    <span className="text-[8px] font-black px-2 py-0.5 bg-[#FF4500] text-white uppercase tracking-widest">{file.scrubStatus || 'SECURED'}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {duplicates && duplicates.length > 0 && (
                    <div className="border-4 border-[#FF4500] p-8 space-y-6 animate-pulse hover:animate-none bg-[#FF4500]/5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-1 bg-[#FF4500]" />
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#FF4500]">Similarity Alert</h3>
                        </div>
                        <p className="text-xs font-bold leading-relaxed text-slate-950 uppercase opacity-80">
                            Concept overlap detected with {duplicates.length} active initiatives. Strategic alignment is required to proceed.
                        </p>
                        
                        <div className="grid gap-4 sm:grid-cols-2">
                            <button
                                type="button"
                                onClick={() => setForm(c => ({ ...c, duplicateDecision: 'MERGE' }))}
                                className={`p-6 border-4 transition-all text-left group ${
                                    form.duplicateDecision === 'MERGE' 
                                        ? 'border-slate-950 bg-slate-950 text-white' 
                                        : 'border-slate-200 hover:border-slate-950'
                                }`}
                            >
                                <div className="text-[8px] font-black uppercase mb-1 opacity-60">Path A</div>
                                <div className="text-sm font-black uppercase tracking-tighter">Collaborate</div>
                                <div className="mt-4 text-[10px] font-bold leading-snug group-hover:text-[#FF4500]">Merge Proposal</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setForm(c => ({ ...c, duplicateDecision: 'PROCEED_AS_UNIQUE' }))}
                                className={`p-6 border-4 transition-all text-left group ${
                                    form.duplicateDecision === 'PROCEED_AS_UNIQUE' 
                                        ? 'border-[#FF4500] bg-[#FF4500] text-white' 
                                        : 'border-slate-200 hover:border-[#FF4500]'
                                }`}
                            >
                                <div className="text-[8px] font-black uppercase mb-1 opacity-60">Path B</div>
                                <div className="text-sm font-black uppercase tracking-tighter">Differentiate</div>
                                <div className="mt-4 text-[10px] font-bold leading-snug group-hover:text-white/80">Proceed as Unique</div>
                            </button>
                        </div>
                    </div>
                )}

                {form.duplicateDecision === 'MERGE' && duplicates.length > 0 && (
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Merge Into Existing Idea</label>
                        <div className="grid gap-3">
                            {duplicates.map((duplicate) => {
                                const active = form.mergeTargetIdeaId === duplicate.id;
                                return (
                                    <button
                                        key={duplicate.id}
                                        type="button"
                                        onClick={() => setForm((current) => ({ ...current, mergeTargetIdeaId: duplicate.id }))}
                                        className={`border-2 p-4 text-left transition-all ${active ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white hover:border-slate-950'}`}
                                    >
                                        <div className="text-xs font-black uppercase tracking-widest">{duplicate.topic}</div>
                                        <div className={`mt-2 text-[10px] font-bold uppercase tracking-wide ${active ? 'text-white/80' : 'text-slate-500'}`}>
                                            Similarity {(Number(duplicate.similarityScore || 0) * 100).toFixed(0)}%
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={submitting || (form.duplicateDecision === 'MERGE' && !form.mergeTargetIdeaId)}
                    className="w-full bg-slate-950 py-8 text-white text-[10px] font-black uppercase tracking-[0.8em] hover:bg-[#FF4500] hover:tracking-[1.2em] transition-all disabled:opacity-50"
                >
                    {submitting ? 'Registering...' : 'Deploy Initiative'}
                </button>
            </form>
        </div>
    );
}
