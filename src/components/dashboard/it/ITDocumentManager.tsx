'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    File, Upload, Trash2, Download, ExternalLink, Plus,
    FileText, Image as ImageIcon, FileCode, Archive, X,
    FolderOpen, Filter, Type, Eye, Save, Globe
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import ReactQuill for SSR compatibility
const ReactQuill = dynamic(() => import('react-quill-new'), { 
    ssr: false,
    loading: () => <div className="h-48 w-full bg-slate-50 animate-pulse rounded-2xl border border-slate-200" />
});
import 'react-quill-new/dist/quill.snow.css';

interface ITDocument {
    id: string;
    name: string;
    description: string | null;
    content: string | null;
    url: string | null;
    fileType: string;
    fileSize: number;
    category: string;
    createdAt: string;
}

interface ITDocumentManagerProps {
    projectId: string;
    canManage?: boolean;
}

const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="h-6 w-6 text-red-500" />;
    if (type.includes('image')) return <ImageIcon className="h-6 w-6 text-blue-500" />;
    if (type.includes('word') || type.includes('msword')) return <FileText className="h-6 w-6 text-blue-600" />;
    if (type.includes('code') || type.includes('json') || type.includes('javascript')) return <FileCode className="h-6 w-6 text-purple-500" />;
    if (type.includes('zip') || type.includes('rar')) return <Archive className="h-6 w-6 text-yellow-600" />;
    if (type.includes('html')) return <Type className="h-6 w-6 text-emerald-500" />;
    return <File className="h-6 w-6 text-gray-500" />;
};

const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function ITDocumentManager({ projectId, canManage = false }: ITDocumentManagerProps) {
    const [documents, setDocuments] = useState<ITDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [viewDoc, setViewDoc] = useState<ITDocument | null>(null);

    // Upload Form State
    const [uploadMode, setUploadMode] = useState<'FILE' | 'TEXT'>('FILE');
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [docName, setDocName] = useState('');
    const [docContent, setDocContent] = useState('');
    const [docDescription, setDocDescription] = useState('');
    const [docCategory, setDocCategory] = useState('GENERAL');
    const [filterCategory, setFilterCategory] = useState('ALL');

    const fetchDocuments = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/it/projects/${projectId}/documents`);
            if (response.ok) {
                const data = await response.json();
                setDocuments(data);
            }
        } catch (error) {
            console.error('Error fetching documents:', error);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (uploadMode === 'FILE' && !uploadFile) return;
        if (uploadMode === 'TEXT' && !docContent) return;

        setUploading(true);
        const formData = new FormData();
        
        if (uploadMode === 'FILE' && uploadFile) {
            formData.append('file', uploadFile);
            formData.append('name', docName || uploadFile.name);
        } else {
            formData.append('content', docContent);
            formData.append('name', docName || 'Untitled Note');
        }
        
        formData.append('description', docDescription);
        formData.append('category', docCategory);

        try {
            const response = await fetch(`/api/it/projects/${projectId}/documents`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                setShowUploadModal(false);
                resetForm();
                fetchDocuments();
            } else {
                alert('Submission failed');
            }
        } catch (error) {
            console.error('Submission error:', error);
            alert('An error occurred during submission');
        } finally {
            setUploading(false);
        }
    };

    const resetForm = () => {
        setUploadFile(null);
        setDocName('');
        setDocContent('');
        setDocDescription('');
        setDocCategory('GENERAL');
        setUploadMode('FILE');
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this asset?')) return;

        try {
            const response = await fetch(`/api/it/documents/${id}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                setDocuments(documents.filter(d => d.id !== id));
            }
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    const categories = ['ALL', 'GENERAL', 'SPEC', 'DESIGN', 'CONTRACT', 'INVOICE', 'MANUAL'];
    const filteredDocs = filterCategory === 'ALL'
        ? documents
        : documents.filter(d => d.category === filterCategory);

    return (
        <div className="space-y-8">
            <style jsx global>{`
                .ql-container.ql-snow { border: none !important; }
                .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #e2e8f0 !important; background: #f8fafc; border-radius: 12px 12px 0 0; }
                .ql-editor { min-height: 200px; font-family: inherit; font-size: 14px; color: #1e293b; }
            `}</style>

            {/* Header / Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white/50 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/80 shadow-sm">
                <div className="flex items-center gap-3 overflow-x-auto pb-2 lg:pb-0 custom-scrollbar">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setFilterCategory(cat)}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterCategory === cat
                                ? 'bg-slate-900 text-white shadow-xl shadow-slate-200'
                                : 'bg-white text-slate-500 hover:text-slate-900 border border-slate-100'
                                }`}
                        >
                            {cat} Protocol
                        </button>
                    ))}
                </div>
                {canManage && (
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-200"
                    >
                        <Plus className="h-4 w-4" />
                        New Asset Node
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white/40 rounded-[3rem] border border-dashed border-slate-200">
                    <div className="h-12 w-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-6" />
                    <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Synchronizing Assets...</p>
                </div>
            ) : filteredDocs.length === 0 ? (
                <div className="text-center py-32 bg-white/40 rounded-[3rem] border border-dashed border-slate-200">
                    <div className="bg-slate-100 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-300">
                        <FolderOpen className="h-10 w-10" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">Asset Vault Empty</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest max-w-sm mx-auto">
                        No tactical data nodes detected in this sector. Deploy new assets to begin.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredDocs.map((doc) => (
                        <div
                            key={doc.id}
                            className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm relative group hover:shadow-2xl hover:shadow-slate-200/40 hover:-translate-y-1 transition-all duration-500"
                        >
                            <div className="flex items-start justify-between mb-8">
                                <div className={`p-5 rounded-[1.5rem] ${doc.content ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'} group-hover:scale-110 transition-transform duration-500`}>
                                    {getFileIcon(doc.fileType)}
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {doc.url ? (
                                        <button
                                            onClick={() => window.open(doc.url!, '_blank')}
                                            className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setViewDoc(doc)}
                                            className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </button>
                                    )}
                                    {canManage && (
                                        <button
                                            onClick={() => handleDelete(doc.id)}
                                            className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2 mb-8">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-black text-slate-900 truncate tracking-tight">{doc.name}</h3>
                                    {doc.content && <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 text-[8px] font-black uppercase rounded-lg">Tactical Note</span>}
                                </div>
                                <p className="text-xs text-slate-500 font-medium line-clamp-2 min-h-[32px] leading-relaxed italic">
                                    {doc.description || 'No operational brief provided.'}
                                </p>
                            </div>

                            <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                                <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-lg">
                                    {doc.category}
                                </span>
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-4">
                                    <span>{doc.url ? formatFileSize(doc.fileSize) : 'CONTENT'}</span>
                                    <span className="h-1 w-1 rounded-full bg-slate-200" />
                                    <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload/Creation Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl" onClick={() => setShowUploadModal(false)} />
                    <div className="relative bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl border border-white animate-in zoom-in duration-300">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-slate-900 rounded-[1.25rem] shadow-xl">
                                    <Upload className="h-6 w-6 text-blue-500" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Deploy Asset Node</h2>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select insertion protocol</p>
                                </div>
                            </div>
                            <button onClick={() => setShowUploadModal(false)} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* Mode Toggle */}
                            <div className="flex p-1.5 bg-slate-100 rounded-[1.5rem] w-fit">
                                <button onClick={() => setUploadMode('FILE')}
                                    className={`px-8 py-3 rounded-[1rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${uploadMode === 'FILE' ? 'bg-white text-blue-600 shadow-xl shadow-blue-500/5' : 'text-slate-500 hover:text-slate-900'}`}>
                                    <Upload className="h-4 w-4" /> Binary Upload
                                </button>
                                <button onClick={() => setUploadMode('TEXT')}
                                    className={`px-8 py-3 rounded-[1rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${uploadMode === 'TEXT' ? 'bg-white text-emerald-600 shadow-xl shadow-emerald-500/5' : 'text-slate-500 hover:text-slate-900'}`}>
                                    <Type className="h-4 w-4" /> Tactical Note
                                </button>
                            </div>

                            <form onSubmit={handleUpload} className="space-y-8">
                                {uploadMode === 'FILE' ? (
                                    <div className={`relative border-2 border-dashed rounded-[2rem] p-12 transition-all ${uploadFile ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/50'}`}>
                                        <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) { setUploadFile(file); if (!docName) setDocName(file.name); }
                                            }}
                                        />
                                        <div className="text-center space-y-4">
                                            <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mx-auto transition-all ${uploadFile ? 'bg-blue-600 text-white shadow-xl shadow-blue-200 scale-110' : 'bg-slate-100 text-slate-400'}`}>
                                                <File className="h-8 w-8" />
                                            </div>
                                            {uploadFile ? (
                                                <div>
                                                    <p className="text-slate-900 font-black text-lg">{uploadFile.name}</p>
                                                    <p className="text-blue-500 font-black text-[10px] uppercase tracking-widest mt-1">{formatFileSize(uploadFile.size)} READY FOR INSERTION</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-1">
                                                    <p className="text-slate-900 font-black">DROP TACTICAL BINARY</p>
                                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none">PDF, DOC, IMG UP TO 10MB</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Node Content (Rich Text)</label>
                                        <div className="border border-slate-200 rounded-[2rem] overflow-hidden focus-within:border-emerald-400 transition-colors shadow-sm bg-white">
                                            <ReactQuill theme="snow" value={docContent} onChange={setDocContent} />
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="md:col-span-2 space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Network Name</label>
                                        <input type="text" required value={docName} onChange={(e) => setDocName(e.target.value)} className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-slate-900 font-bold placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" placeholder="Enter asset identity..." />
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Security Category</label>
                                        <select value={docCategory} onChange={(e) => setDocCategory(e.target.value)} className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer">
                                            {categories.filter(c => c !== 'ALL').map(c => <option key={c} value={c}>{c} PROTOCOL</option>)}
                                        </select>
                                    </div>

                                    <div className="md:col-span-2 space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Node Brief (Description)</label>
                                        <textarea value={docDescription} onChange={(e) => setDocDescription(e.target.value)} className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-slate-900 font-bold placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all min-h-[100px] resize-none" placeholder="Strategic summary for this asset..." />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setShowUploadModal(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Abort</button>
                                    <button type="submit" disabled={uploading || (uploadMode === 'FILE' && !uploadFile) || (uploadMode === 'TEXT' && !docContent)} className="flex-[2] py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-slate-200 disabled:opacity-50">
                                        {uploading ? 'Processing Synchronization...' : `Confirm ${uploadMode === 'FILE' ? 'Upload' : 'Note Creation'}`}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* View Note Modal */}
            {viewDoc && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-3xl" onClick={() => setViewDoc(null)} />
                    <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[3.5rem] overflow-hidden shadow-2xl border border-white flex flex-col">
                        <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-white relative">
                            <div className="flex items-center gap-6">
                                <div className="p-5 bg-emerald-500 rounded-[1.5rem] shadow-xl text-white">
                                    <Type className="h-8 w-8" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">{viewDoc.name}</h2>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                                        <Globe className="h-3 w-3" /> Secure Tactical Note Node
                                        <span className="h-1 w-1 rounded-full bg-slate-200" />
                                        Created {new Date(viewDoc.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setViewDoc(null)} className="p-4 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all">
                                <X className="h-6 w-6 text-slate-500" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-[length:150px]">
                            <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-sm min-h-full">
                                <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:tracking-tighter prose-p:font-medium prose-p:leading-relaxed prose-a:text-blue-600 prose-img:rounded-[2rem]" dangerouslySetInnerHTML={{ __html: viewDoc.content || '' }} />
                            </div>
                        </div>
                        <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-4">
                            <button onClick={() => setViewDoc(null)} className="px-10 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl">Close Node</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
