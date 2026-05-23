'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles, Check, Trash2 } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';

export default function DocumentIngestionCenter() {
    const [file, setFile] = useState<File | null>(null);
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [docType, setDocType] = useState<'INVOICE' | 'RESUME'>('INVOICE');
    const [extracting, setExtracting] = useState(false);
    const [committing, setCommitting] = useState(false);
    const [extractedData, setExtractedData] = useState<any>(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setFileUrl(URL.createObjectURL(selectedFile));
            setExtractedData(null);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const selectedFile = e.dataTransfer.files[0];
            setFile(selectedFile);
            setFileUrl(URL.createObjectURL(selectedFile));
            setExtractedData(null);
        }
    };

    const handleExtract = async () => {
        if (!file) return;

        setExtracting(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', docType);

        try {
            const res = await fetch('/api/ai/extract-document', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            const result = await res.json();
            if (result.success && result.data) {
                setExtractedData(result.data);
                toast.success('AI successfully extracted document metadata!');
            } else {
                toast.error(result.error || 'Failed to extract metadata from document.');
            }
        } catch (err) {
            console.error(err);
            toast.error('An error occurred during AI extraction.');
        } finally {
            setExtracting(false);
        }
    };

    const handleFieldChange = (key: string, value: any) => {
        setExtractedData((prev: any) => ({
            ...prev,
            [key]: value
        }));
    };

    const handleLineItemChange = (index: number, key: string, value: any) => {
        setExtractedData((prev: any) => {
            const lineItems = [...(prev.lineItems || [])];
            lineItems[index] = { ...lineItems[index], [key]: value };
            return { ...prev, lineItems };
        });
    };

    const handleCommit = async () => {
        if (!extractedData) return;

        setCommitting(true);
        try {
            const res = await fetch('/api/ai/extract-document/commit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    type: docType,
                    data: extractedData
                })
            });

            const result = await res.json();
            if (result.success) {
                toast.success(result.message || 'Record successfully committed to ledger!');
                setFile(null);
                setFileUrl(null);
                setExtractedData(null);
            } else {
                toast.error(result.error || 'Failed to commit record.');
            }
        } catch (err) {
            console.error(err);
            toast.error('An error occurred while committing the record.');
        } finally {
            setCommitting(false);
        }
    };

    return (
        <div className="card-premium p-8 bg-white border border-secondary-100 shadow-xl rounded-3xl animate-in fade-in duration-500">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-black text-secondary-900 flex items-center gap-2">
                        <Sparkles className="text-primary-600" />
                        AI Smart Ingestion Panel
                    </h2>
                    <p className="text-sm text-secondary-500 font-medium mt-1">
                        Ingest physical invoices or candidate resumes using multimodal Gemini intelligence.
                    </p>
                </div>

                <div className="flex items-center gap-2 p-1 bg-secondary-100 rounded-xl">
                    <button
                        onClick={() => { setDocType('INVOICE'); setExtractedData(null); }}
                        className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${docType === 'INVOICE' ? 'bg-white text-primary-700 shadow-sm' : 'text-secondary-500'}`}
                    >
                        Vendor Invoices
                    </button>
                    <button
                        onClick={() => { setDocType('RESUME'); setExtractedData(null); }}
                        className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${docType === 'RESUME' ? 'bg-white text-primary-700 shadow-sm' : 'text-secondary-500'}`}
                    >
                        Candidate Resumes
                    </button>
                </div>
            </div>

            {!file ? (
                <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={handleUploadClick}
                    className="border-2 border-dashed border-secondary-200 hover:border-primary-500 rounded-3xl p-16 text-center cursor-pointer transition-all bg-secondary-50/50 hover:bg-primary-50/10 flex flex-col items-center justify-center space-y-4"
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="application/pdf,image/*"
                        className="hidden"
                    />
                    <div className="w-16 h-16 bg-white border border-secondary-100 rounded-2xl flex items-center justify-center shadow-md text-secondary-400">
                        <Upload size={28} />
                    </div>
                    <div>
                        <p className="text-base font-black text-secondary-800">Drag & drop your file here, or click to browse</p>
                        <p className="text-xs text-secondary-400 font-bold uppercase mt-1">Supports PDF & Image files up to 10MB</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Selected File Details */}
                    <div className="flex items-center justify-between p-4 bg-secondary-50 border border-secondary-100 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
                                <FileText size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-black text-secondary-900">{file.name}</p>
                                <p className="text-[10px] text-secondary-400 font-bold uppercase">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleExtract}
                                disabled={extracting}
                                className="btn btn-primary px-6 py-2 text-xs font-black shadow-md flex items-center gap-1.5"
                            >
                                {extracting ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" /> Ingesting with Gemini...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={14} /> Run AI Extraction
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => { setFile(null); setFileUrl(null); setExtractedData(null); }}
                                className="p-2 border border-secondary-200 hover:border-rose-200 text-secondary-400 hover:text-rose-600 rounded-xl transition-all"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>

                    {extracting && (
                        <div className="w-full bg-secondary-100 rounded-full h-1.5 overflow-hidden animate-pulse">
                            <div className="bg-primary-600 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }} />
                        </div>
                    )}

                    {extractedData && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                            {/* Left Side: Document Preview */}
                            <div className="border border-secondary-100 rounded-3xl overflow-hidden h-[500px] bg-secondary-50 relative flex items-center justify-center">
                                {file.type.startsWith('image/') ? (
                                    <Image
                                        src={fileUrl || ''}
                                        alt="Document Preview"
                                        width={1200}
                                        height={1600}
                                        className="max-h-full w-auto object-contain"
                                        unoptimized
                                    />
                                ) : (
                                    <iframe src={fileUrl || ''} className="w-full h-full border-none" title="Document Preview" />
                                )}
                            </div>

                            {/* Right Side: Verification Form */}
                            <div className="flex flex-col justify-between h-[500px] border border-secondary-100 rounded-3xl p-6 bg-white shadow-inner overflow-y-auto">
                                <div className="space-y-6">
                                    <div className="border-b border-secondary-100 pb-3">
                                        <h3 className="text-lg font-black text-secondary-900 flex items-center gap-1.5">
                                            <CheckCircle2 className="text-emerald-500" size={18} />
                                            Verify Data Fields
                                        </h3>
                                        <p className="text-xs text-secondary-400 font-bold uppercase mt-1">Review extracted JSON properties before saving</p>
                                    </div>

                                    {docType === 'INVOICE' ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-wider block mb-1">Vendor Name</label>
                                                    <input
                                                        type="text"
                                                        value={extractedData.vendorName || ''}
                                                        onChange={(e) => handleFieldChange('vendorName', e.target.value)}
                                                        className="w-full p-2.5 border border-secondary-200 rounded-xl text-sm font-bold text-secondary-900"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-wider block mb-1">Invoice #</label>
                                                    <input
                                                        type="text"
                                                        value={extractedData.invoiceNumber || ''}
                                                        onChange={(e) => handleFieldChange('invoiceNumber', e.target.value)}
                                                        className="w-full p-2.5 border border-secondary-200 rounded-xl text-sm font-bold text-secondary-900"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-wider block mb-1">Total Amount</label>
                                                    <input
                                                        type="number"
                                                        value={extractedData.totalAmount || 0}
                                                        onChange={(e) => handleFieldChange('totalAmount', Number(e.target.value))}
                                                        className="w-full p-2.5 border border-secondary-200 rounded-xl text-sm font-bold text-secondary-900"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-wider block mb-1">Currency</label>
                                                    <input
                                                        type="text"
                                                        value={extractedData.currency || 'INR'}
                                                        onChange={(e) => handleFieldChange('currency', e.target.value)}
                                                        className="w-full p-2.5 border border-secondary-200 rounded-xl text-sm font-bold text-secondary-900"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-wider block mb-1">Invoice Date</label>
                                                    <input
                                                        type="date"
                                                        value={extractedData.date || ''}
                                                        onChange={(e) => handleFieldChange('date', e.target.value)}
                                                        className="w-full p-2.5 border border-secondary-200 rounded-xl text-sm font-bold text-secondary-900"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-2">Line Items</h4>
                                                <div className="space-y-2 border border-secondary-100 rounded-2xl p-3 bg-secondary-50/50">
                                                    {extractedData.lineItems?.map((item: any, idx: number) => (
                                                        <div key={idx} className="grid grid-cols-4 gap-2">
                                                            <input
                                                                type="text"
                                                                placeholder="Item description"
                                                                value={item.description || ''}
                                                                onChange={(e) => handleLineItemChange(idx, 'description', e.target.value)}
                                                                className="col-span-3 p-1.5 border border-secondary-200 rounded-lg text-xs font-bold"
                                                            />
                                                            <input
                                                                type="number"
                                                                placeholder="Amt"
                                                                value={item.amount || 0}
                                                                onChange={(e) => handleLineItemChange(idx, 'amount', Number(e.target.value))}
                                                                className="p-1.5 border border-secondary-200 rounded-lg text-xs font-bold text-right"
                                                            />
                                                        </div>
                                                    )) || <p className="text-xs text-secondary-400 italic">No line items extracted.</p>}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-wider block mb-1">First Name</label>
                                                    <input
                                                        type="text"
                                                        value={extractedData.firstName || ''}
                                                        onChange={(e) => handleFieldChange('firstName', e.target.value)}
                                                        className="w-full p-2.5 border border-secondary-200 rounded-xl text-sm font-bold text-secondary-900"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-wider block mb-1">Last Name</label>
                                                    <input
                                                        type="text"
                                                        value={extractedData.lastName || ''}
                                                        onChange={(e) => handleFieldChange('lastName', e.target.value)}
                                                        className="w-full p-2.5 border border-secondary-200 rounded-xl text-sm font-bold text-secondary-900"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-wider block mb-1">Email</label>
                                                    <input
                                                        type="email"
                                                        value={extractedData.email || ''}
                                                        onChange={(e) => handleFieldChange('email', e.target.value)}
                                                        className="w-full p-2.5 border border-secondary-200 rounded-xl text-sm font-bold text-secondary-900"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-wider block mb-1">Phone</label>
                                                    <input
                                                        type="text"
                                                        value={extractedData.phone || ''}
                                                        onChange={(e) => handleFieldChange('phone', e.target.value)}
                                                        className="w-full p-2.5 border border-secondary-200 rounded-xl text-sm font-bold text-secondary-900"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-wider block mb-1">Exp Years</label>
                                                    <input
                                                        type="number"
                                                        value={extractedData.experienceYears || 0}
                                                        onChange={(e) => handleFieldChange('experienceYears', Number(e.target.value))}
                                                        className="w-full p-2.5 border border-secondary-200 rounded-xl text-sm font-bold text-secondary-900"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-wider block mb-1">Last Employer</label>
                                                    <input
                                                        type="text"
                                                        value={extractedData.lastEmployer || ''}
                                                        onChange={(e) => handleFieldChange('lastEmployer', e.target.value)}
                                                        className="w-full p-2.5 border border-secondary-200 rounded-xl text-sm font-bold text-secondary-900"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black text-secondary-400 uppercase tracking-wider block mb-1">Key Skills</label>
                                                <div className="flex flex-wrap gap-1.5 p-3 border border-secondary-200 rounded-2xl bg-secondary-50/50">
                                                    {extractedData.skills?.map((skill: string, idx: number) => (
                                                        <span key={idx} className="px-2.5 py-1 bg-white border border-secondary-200 rounded-lg text-xs font-bold text-secondary-700">
                                                            {skill}
                                                        </span>
                                                    )) || <p className="text-xs text-secondary-400 italic">No skills extracted.</p>}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={handleCommit}
                                    disabled={committing}
                                    className="btn btn-primary w-full py-3.5 text-sm font-black shadow-lg flex items-center justify-center gap-2 mt-8"
                                >
                                    {committing ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" /> Committing...
                                        </>
                                    ) : (
                                        <>
                                            <Check size={16} /> Approve & Commit to Database
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
