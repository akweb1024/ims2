'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { ArrowLeft, ArrowRight, Check, Upload, Plus, Trash2, Save } from 'lucide-react';

const STEPS = [
    { id: 1, name: 'Journal & Metadata', icon: '📝' },
    { id: 2, name: 'Authors', icon: '👥' },
    { id: 3, name: 'File Upload', icon: '📄' },
    { id: 4, name: 'Review & Submit', icon: '✅' }
];

function SubmitManuscriptContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const draftId = searchParams?.get('draftId');

    const [currentStep, setCurrentStep] = useState(1);
    const [journals, setJournals] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    const [formData, setFormData] = useState({
        journalId: '',
        title: '',
        abstract: '',
        keywords: '',
        authors: [
            { name: '', email: '', affiliation: '', isCorresponding: true }
        ],
        fileUrl: '',
        draftId: draftId || null
    });

    useEffect(() => {
        fetchJournals();
        if (draftId) {
            loadDraft(draftId);
        }
    }, [draftId]); // fetchJournals and loadDraft are stable if defined outside or memoized correctly, but for now I'll memoize them below.

    const saveDraft = useCallback(async () => {
        setSaving(true);
        try {
            const method = formData.draftId ? 'PATCH' : 'POST';
            const url = formData.draftId
                ? `/api/manuscripts/drafts/${formData.draftId}`
                : '/api/manuscripts/drafts';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    journalId: formData.journalId,
                    title: formData.title,
                    abstract: formData.abstract,
                    keywords: formData.keywords,
                    fileUrl: formData.fileUrl,
                    metadata: { authors: formData.authors },
                    step: currentStep
                })
            });

            if (res.ok) {
                const draft = await res.json();
                if (!formData.draftId) {
                    setFormData(prev => ({ ...prev, draftId: draft.id }));
                }
                setLastSaved(new Date());
            }
        } catch (error) {
            console.error('Error saving draft:', error);
        } finally {
            setSaving(false);
        }
    }, [formData, currentStep]);

    // Auto-save every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            if (formData.journalId && formData.title) {
                saveDraft();
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [formData.journalId, formData.title, saveDraft]);

    const fetchJournals = async () => {
        try {
            const res = await fetch('/api/journals?isActive=true');
            if (res.ok) {
                setJournals(await res.json());
            }
        } catch (error) {
            console.error('Error fetching journals:', error);
        }
    };

    const loadDraft = async (id: string) => {
        try {
            const res = await fetch(`/api/manuscripts/drafts/${id}`);
            if (res.ok) {
                const draft = await res.json();
                setFormData({
                    journalId: draft.journalId,
                    title: draft.title || '',
                    abstract: draft.abstract || '',
                    keywords: draft.keywords || '',
                    authors: draft.metadata?.authors || [{ name: '', email: '', affiliation: '', isCorresponding: true }],
                    fileUrl: draft.fileUrl || '',
                    draftId: draft.id
                });
                setCurrentStep(draft.step || 1);
            }
        } catch (error) {
            console.error('Error loading draft:', error);
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const res = await fetch('/api/manuscripts/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    draftId: formData.draftId
                })
            });

            if (res.ok) {
                const data = await res.json();
                alert(`Manuscript submitted successfully! Manuscript ID: ${data.manuscriptId}`);
                router.push('/dashboard/author');
            } else {
                const error = await res.json();
                alert(`Submission failed: ${error.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Submission error:', error);
            alert('Submission failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const addAuthor = () => {
        setFormData(prev => ({
            ...prev,
            authors: [...prev.authors, { name: '', email: '', affiliation: '', isCorresponding: false }]
        }));
    };

    const removeAuthor = (index: number) => {
        if (formData.authors.length > 1) {
            setFormData(prev => ({
                ...prev,
                authors: prev.authors.filter((_, i) => i !== index)
            }));
        }
    };

    const updateAuthor = (index: number, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            authors: prev.authors.map((author, i) =>
                i === index ? { ...author, [field]: value } : author
            )
        }));
    };

    const canProceed = () => {
        switch (currentStep) {
            case 1:
                return formData.journalId && formData.title && formData.abstract;
            case 2:
                return formData.authors.every(a => a.name && a.email) &&
                    formData.authors.some(a => a.isCorresponding);
            case 3:
                return formData.fileUrl;
            case 4:
                return true;
            default:
                return false;
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        <div>
                            <label className="label-premium">Select Journal *</label>
                            <select
                                className="input-premium"
                                value={formData.journalId}
                                onChange={e => setFormData({ ...formData, journalId: e.target.value })}
                                required
                            >
                                <option value="">Choose a journal...</option>
                                {journals.map(journal => (
                                    <option key={journal.id} value={journal.id}>
                                        {journal.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="label-premium">Manuscript Title *</label>
                            <input
                                type="text"
                                className="input-premium"
                                placeholder="Enter the title of your manuscript"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="label-premium">Abstract *</label>
                            <textarea
                                className="input-premium"
                                rows={8}
                                placeholder="Enter the abstract (200-300 words recommended)"
                                value={formData.abstract}
                                onChange={e => setFormData({ ...formData, abstract: e.target.value })}
                                required
                            />
                            <p className="text-xs text-secondary-500 mt-1">
                                Word count: {formData.abstract.split(/\s+/).filter(Boolean).length}
                            </p>
                        </div>

                        <div>
                            <label className="label-premium">Keywords</label>
                            <input
                                type="text"
                                className="input-premium"
                                placeholder="Enter keywords separated by commas"
                                value={formData.keywords}
                                onChange={e => setFormData({ ...formData, keywords: e.target.value })}
                            />
                            <p className="text-xs text-secondary-500 mt-1">
                                Separate multiple keywords with commas (e.g., machine learning, AI, neural networks)
                            </p>
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-secondary-900">Authors</h3>
                            <button
                                type="button"
                                onClick={addAuthor}
                                className="btn-secondary flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add Author
                            </button>
                        </div>

                        {formData.authors.map((author, index) => (
                            <div key={index} className="card-premium p-6 space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-secondary-900">Author {index + 1}</h4>
                                    {formData.authors.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeAuthor(index)}
                                            className="text-rose-600 hover:text-rose-700"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="label-premium">Full Name *</label>
                                        <input
                                            type="text"
                                            className="input-premium"
                                            placeholder="John Doe"
                                            value={author.name}
                                            onChange={e => updateAuthor(index, 'name', e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="label-premium">Email *</label>
                                        <input
                                            type="email"
                                            className="input-premium"
                                            placeholder="john@example.com"
                                            value={author.email}
                                            onChange={e => updateAuthor(index, 'email', e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="label-premium">Affiliation</label>
                                    <input
                                        type="text"
                                        className="input-premium"
                                        placeholder="University or Institution"
                                        value={author.affiliation}
                                        onChange={e => updateAuthor(index, 'affiliation', e.target.value)}
                                    />
                                </div>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={author.isCorresponding}
                                        onChange={e => {
                                            // Ensure only one corresponding author
                                            if (e.target.checked) {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    authors: prev.authors.map((a, i) => ({
                                                        ...a,
                                                        isCorresponding: i === index
                                                    }))
                                                }));
                                            }
                                        }}
                                        className="rounded text-primary-600 focus:ring-primary-500"
                                    />
                                    <span className="text-sm font-medium text-secondary-700">
                                        Corresponding Author
                                    </span>
                                </label>
                            </div>
                        ))}

                        {!formData.authors.some(a => a.isCorresponding) && (
                            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                                <p className="text-sm text-orange-700 font-medium">
                                    ⚠️ Please select at least one corresponding author
                                </p>
                            </div>
                        )}
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-6">
                        <div className="text-center p-12 border-2 border-dashed border-secondary-300 rounded-xl hover:border-primary-500 transition-colors cursor-pointer bg-secondary-50/50">
                            <Upload className="w-16 h-16 text-secondary-400 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-secondary-900 mb-2">Upload Manuscript File</h3>
                            <p className="text-sm text-secondary-600 mb-4">
                                Drag and drop your file here, or click to browse
                            </p>
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                className="hidden"
                                id="file-upload"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setSaving(true);
                                        const formDataToUpload = new FormData();
                                        formDataToUpload.append('file', file);
                                        formDataToUpload.append('category', 'publications');
                                        if (formData.journalId) {
                                            formDataToUpload.append('journalId', formData.journalId);
                                        }

                                        try {
                                            const res = await fetch('/api/manuscripts/upload', {
                                                method: 'POST',
                                                body: formDataToUpload
                                            });

                                            if (res.ok) {
                                                const data = await res.json();
                                                setFormData({ ...formData, fileUrl: data.url });
                                                setLastSaved(new Date());
                                            } else {
                                                alert('Failed to upload file');
                                            }
                                        } catch (error) {
                                            console.error('Upload error:', error);
                                            alert('Error uploading file');
                                        } finally {
                                            setSaving(false);
                                        }
                                    }
                                }}
                            />
                            <label htmlFor="file-upload" className="btn-primary cursor-pointer inline-block">
                                Choose File
                            </label>
                            <p className="text-xs text-secondary-500 mt-4">
                                Supported formats: PDF, DOC, DOCX (Max 10MB)
                            </p>
                        </div>

                        {formData.fileUrl && (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Check className="w-5 h-5 text-green-600" />
                                    <div>
                                        <p className="font-medium text-green-900">File uploaded successfully</p>
                                        <p className="text-sm text-green-700">{formData.fileUrl}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, fileUrl: '' })}
                                    className="text-rose-600 hover:text-rose-700"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                );

            case 4:
                return (
                    <div className="space-y-6">
                        <div className="card-premium p-6">
                            <h3 className="text-lg font-bold text-secondary-900 mb-4">Review Your Submission</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-secondary-500 uppercase">Journal</label>
                                    <p className="text-secondary-900 font-medium">
                                        {journals.find(j => j.id === formData.journalId)?.name}
                                    </p>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-secondary-500 uppercase">Title</label>
                                    <p className="text-secondary-900 font-medium">{formData.title}</p>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-secondary-500 uppercase">Abstract</label>
                                    <p className="text-secondary-700 text-sm">{formData.abstract}</p>
                                </div>

                                {formData.keywords && (
                                    <div>
                                        <label className="text-xs font-bold text-secondary-500 uppercase">Keywords</label>
                                        <p className="text-secondary-700">{formData.keywords}</p>
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-bold text-secondary-500 uppercase">Authors</label>
                                    <div className="space-y-2 mt-2">
                                        {formData.authors.map((author, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <span className="text-secondary-900">{author.name}</span>
                                                <span className="text-secondary-600">({author.email})</span>
                                                {author.isCorresponding && (
                                                    <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full font-bold">
                                                        Corresponding
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-secondary-500 uppercase">Manuscript File</label>
                                    <p className="text-secondary-700">{formData.fileUrl}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-900">
                                <strong>Note:</strong> By submitting this manuscript, you confirm that all authors have approved this submission and that the work is original.
                            </p>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto p-6 space-y-8 pb-20">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-secondary-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-secondary-600" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-black text-secondary-900">Submit Manuscript</h1>
                        <p className="text-sm text-secondary-600 mt-1">
                            {lastSaved && (
                                <span className="flex items-center gap-2">
                                    <Save className="w-4 h-4" />
                                    Last saved: {lastSaved.toLocaleTimeString()}
                                </span>
                            )}
                        </p>
                    </div>
                    <button
                        onClick={saveDraft}
                        disabled={saving}
                        className="btn-secondary"
                    >
                        {saving ? 'Saving...' : 'Save Draft'}
                    </button>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center justify-between">
                    {STEPS.map((step, index) => (
                        <div key={step.id} className="flex items-center flex-1">
                            <div className="flex flex-col items-center flex-1">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2 transition-all ${currentStep > step.id
                                    ? 'bg-green-500 border-green-500 text-white'
                                    : currentStep === step.id
                                        ? 'bg-primary-600 border-primary-600 text-white'
                                        : 'bg-white border-secondary-300 text-secondary-400'
                                    }`}>
                                    {currentStep > step.id ? <Check className="w-6 h-6" /> : step.icon}
                                </div>
                                <p className={`text-xs font-bold mt-2 text-center ${currentStep === step.id ? 'text-primary-600' : 'text-secondary-600'
                                    }`}>
                                    {step.name}
                                </p>
                            </div>
                            {index < STEPS.length - 1 && (
                                <div className={`h-0.5 flex-1 mx-2 ${currentStep > step.id ? 'bg-green-500' : 'bg-secondary-200'
                                    }`} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                <div className="card-premium p-8">
                    {renderStep()}
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between">
                    <button
                        onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                        disabled={currentStep === 1}
                        className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Previous
                    </button>

                    {currentStep < 4 ? (
                        <button
                            onClick={() => {
                                if (canProceed()) {
                                    setCurrentStep(prev => prev + 1);
                                    saveDraft();
                                }
                            }}
                            disabled={!canProceed()}
                            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || !canProceed()}
                            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Submitting...' : 'Submit Manuscript'}
                            <Check className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}

export default function SubmitManuscript() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SubmitManuscriptContent />
        </Suspense>
    );
}
