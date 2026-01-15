'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    File,
    Upload,
    Trash2,
    Download,
    ExternalLink,
    Plus,
    FileText,
    Image as ImageIcon,
    FileCode,
    Archive,
    X,
    FolderOpen,
    Filter
} from 'lucide-react';

interface ITDocument {
    id: string;
    name: string;
    description: string | null;
    url: string;
    fileType: string;
    fileSize: number;
    category: string;
    createdAt: string;
}

interface ITDocumentManagerProps {
    projectId: string;
}

const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="h-6 w-6 text-red-500" />;
    if (type.includes('image')) return <ImageIcon className="h-6 w-6 text-blue-500" />;
    if (type.includes('word') || type.includes('msword')) return <FileText className="h-6 w-6 text-blue-600" />;
    if (type.includes('code') || type.includes('json') || type.includes('javascript')) return <FileCode className="h-6 w-6 text-purple-500" />;
    if (type.includes('zip') || type.includes('rar')) return <Archive className="h-6 w-6 text-yellow-600" />;
    return <File className="h-6 w-6 text-gray-500" />;
};

const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function ITDocumentManager({ projectId }: ITDocumentManagerProps) {
    const [documents, setDocuments] = useState<ITDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);

    // Upload Form State
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [docName, setDocName] = useState('');
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
        if (!uploadFile) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('name', docName || uploadFile.name);
        formData.append('description', docDescription);
        formData.append('category', docCategory);

        try {
            const response = await fetch(`/api/it/projects/${projectId}/documents`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                setShowUploadModal(false);
                setUploadFile(null);
                setDocName('');
                setDocDescription('');
                fetchDocuments();
            } else {
                alert('Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('An error occurred during upload');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this document?')) return;

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
        <div className="space-y-6">
            {/* Header / Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-secondary-50/50 p-4 rounded-2xl border border-secondary-100">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setFilterCategory(cat)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${filterCategory === cat
                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20'
                                : 'bg-white text-secondary-600 hover:bg-secondary-100 border border-secondary-200'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="btn btn-primary shadow-primary-500/20"
                >
                    <Plus className="h-4 w-4" />
                    Upload Document
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-3xl border border-dashed border-secondary-200">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                    <p className="text-secondary-500 font-bold uppercase tracking-widest text-xs">Loading documents...</p>
                </div>
            ) : filteredDocs.length === 0 ? (
                <div className="text-center py-20 bg-white/50 rounded-3xl border border-dashed border-secondary-200">
                    <div className="bg-secondary-100 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4">
                        <File className="h-8 w-8 text-secondary-400" />
                    </div>
                    <h3 className="text-lg font-black text-secondary-900 mb-1">No documents found</h3>
                    <p className="text-secondary-500 text-sm">
                        {filterCategory === 'ALL' ? 'Start by uploading project specifications or contracts.' : `No documents in ${filterCategory} category.`}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDocs.map((doc) => (
                        <div
                            key={doc.id}
                            className="card-premium group relative hover:translate-y-[-4px] p-5"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-secondary-50 dark:bg-secondary-800 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                                    {getFileIcon(doc.fileType)}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => window.open(doc.url, '_blank')}
                                        className="p-2 hover:bg-primary-50 rounded-xl text-primary-600 transition-colors tooltip"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                        <span className="tooltip-text">View / Download</span>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(doc.id)}
                                        className="p-2 hover:bg-danger-50 rounded-xl text-danger-600 transition-colors tooltip"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        <span className="tooltip-text">Delete Permanente</span>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <h3 className="font-black text-secondary-900 dark:text-white truncate">
                                    {doc.name}
                                </h3>
                                {doc.description && (
                                    <p className="text-xs text-secondary-500 line-clamp-2 min-h-[32px]">
                                        {doc.description}
                                    </p>
                                )}
                            </div>

                            <div className="mt-4 pt-4 border-t border-secondary-100 dark:border-secondary-800 flex items-center justify-between text-[10px] font-bold text-secondary-400 uppercase tracking-widest">
                                <div className="flex items-center gap-3">
                                    <span className="bg-secondary-100 dark:bg-secondary-800 px-2 py-0.5 rounded text-secondary-600">
                                        {doc.category}
                                    </span>
                                    <span>{formatFileSize(doc.fileSize)}</span>
                                </div>
                                <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md transition-all">
                    <div className="card-premium w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300 p-0 shadow-2xl">
                        <div className="flex items-center justify-between p-6 border-b border-secondary-100 dark:border-secondary-800 bg-secondary-50/30">
                            <h2 className="text-xl font-black text-secondary-900 dark:text-white flex items-center gap-2">
                                <Upload className="h-5 w-5 text-primary-500" />
                                Upload Project Document
                            </h2>
                            <button
                                onClick={() => setShowUploadModal(false)}
                                className="p-2 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-full transition-all"
                            >
                                <X className="h-5 w-5 text-secondary-500" />
                            </button>
                        </div>

                        <form onSubmit={handleUpload} className="p-8 space-y-6">
                            {/* File Drop Area */}
                            <div className={`relative border-2 border-dashed rounded-3xl p-8 transition-all ${uploadFile ? 'border-primary-500 bg-primary-50/30' : 'border-secondary-200 hover:border-primary-400 hover:bg-secondary-50/30'}`}>
                                <input
                                    type="file"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setUploadFile(file);
                                            if (!docName) setDocName(file.name);
                                        }
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="text-center">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-colors ${uploadFile ? 'bg-primary-500 text-white' : 'bg-secondary-100 text-secondary-400'}`}>
                                        <File className="h-6 w-6" />
                                    </div>
                                    {uploadFile ? (
                                        <p className="text-secondary-900 font-black truncate">{uploadFile.name}</p>
                                    ) : (
                                        <>
                                            <p className="text-secondary-900 font-black">Click or drag file to upload</p>
                                            <p className="text-secondary-400 text-[10px] font-bold uppercase mt-1">PDF, DOC, IMG up to 10MB</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="label-premium text-[10px]">Display Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={docName}
                                        onChange={(e) => setDocName(e.target.value)}
                                        className="input-premium"
                                        placeholder="Enter document name..."
                                    />
                                </div>

                                <div>
                                    <label className="label-premium text-[10px]">Category</label>
                                    <select
                                        value={docCategory}
                                        onChange={(e) => setDocCategory(e.target.value)}
                                        className="input-premium"
                                    >
                                        {categories.filter(c => c !== 'ALL').map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="label-premium text-[10px]">Short Description</label>
                                    <textarea
                                        value={docDescription}
                                        onChange={(e) => setDocDescription(e.target.value)}
                                        className="input-premium h-20 pt-3"
                                        placeholder="What is this document about?"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowUploadModal(false)}
                                    className="btn btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading || !uploadFile}
                                    className="btn btn-primary flex-1 py-4 font-black uppercase tracking-widest"
                                >
                                    {uploading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Uploading...</span>
                                        </div>
                                    ) : (
                                        'Upload Document'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
