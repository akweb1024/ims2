'use client';

import { useState } from 'react';
import { useDigitalDocuments, useDigitalDocumentMutations } from '@/hooks/useHR';
import { FileText, CheckCircle2, Clock, ShieldCheck, Download, Eye, X, Briefcase, FileSignature, FileArchive } from 'lucide-react';

interface EmployeeDocumentsProps {
    data?: any; // The documents state from page.tsx (application/profile)
    fullProfile?: any;
}

export default function EmployeeDocuments({ data, fullProfile }: EmployeeDocumentsProps) {
    const { data: digitalDocs, isLoading: digitalLoading } = useDigitalDocuments();
    const { sign } = useDigitalDocumentMutations();
    const [viewingDoc, setViewingDoc] = useState<any>(null);
    const [isSigning, setIsSigning] = useState(false);
    const [activeSection, setActiveSection] = useState<'COMPLIANCE' | 'CORE'>('COMPLIANCE');

    const handleSign = async () => {
        try {
            await sign.mutateAsync({ id: viewingDoc.id });
            alert('Document signed successfully!');
            setViewingDoc(null);
            setIsSigning(false);
        } catch (err) {
            alert('Failed to sign document');
        }
    };

    if (digitalLoading && !data) return <div className="p-10 text-center font-bold text-secondary-400">Loading your document portal...</div>;

    const coreDocs = [
        {
            name: 'Offer Letter',
            url: data?.application?.offerLetterUrl || fullProfile?.offerLetterUrl,
            icon: <FileText size={20} />,
            description: 'Official appointment letter'
        },
        {
            name: 'Employment Contract',
            url: data?.application?.contractUrl || fullProfile?.contractUrl,
            icon: <FileSignature size={20} />,
            description: 'Legal terms and conditions'
        },
        {
            name: 'Job Description',
            url: null, // We show inline if title exists
            inlineData: data?.application?.jobPosting,
            icon: <Briefcase size={20} />,
            description: 'Roles & Responsibilities'
        }
    ].filter(d => d.url || d.inlineData);

    const additionalDocs = fullProfile?.documents || data?.profile?.documents || [];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
            {/* Header Stats & Navigation */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2rem] border border-secondary-100 shadow-sm">
                <div>
                    <h2 className="text-3xl font-black text-secondary-900 tracking-tight">Staff Documents</h2>
                    <p className="text-secondary-500 font-medium">Access and manage your contracts, official documents and compliance records.</p>
                </div>
                <div className="flex bg-secondary-100/50 p-1.5 rounded-2xl">
                    <button
                        onClick={() => setActiveSection('COMPLIANCE')}
                        className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeSection === 'COMPLIANCE' ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-500 hover:text-secondary-900'}`}
                    >
                        Compliance Docs {(digitalDocs?.filter((d: any) => d.status === 'PENDING').length || 0) > 0 && <span className="ml-2 bg-warning-500 text-white w-5 h-5 inline-flex items-center justify-center rounded-full text-[10px]">{digitalDocs?.filter((d: any) => d.status === 'PENDING').length}</span>}
                    </button>
                    <button
                        onClick={() => setActiveSection('CORE')}
                        className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeSection === 'CORE' ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-500 hover:text-secondary-900'}`}
                    >
                        Employment Core
                    </button>
                </div>
            </div>

            {activeSection === 'COMPLIANCE' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                    {digitalDocs?.map((doc: any) => (
                        <div
                            key={doc.id}
                            className={`card-premium p-6 group transition-all duration-300 relative overflow-hidden ${doc.status === 'PENDING' ? 'border-l-4 border-l-warning-500 hover:shadow-xl' : 'border-l-4 border-l-success-500 opacity-80'}`}
                        >
                            {doc.status === 'SIGNED' && (
                                <div className="absolute -right-4 -top-4 w-12 h-12 bg-success-500 rotate-45 flex items-end justify-center pb-1">
                                    <CheckCircle2 size={12} className="text-white -rotate-45" />
                                </div>
                            )}
                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-3 rounded-2xl ${doc.status === 'PENDING' ? 'bg-warning-50 text-warning-600' : 'bg-success-50 text-success-600'}`}>
                                    <FileSignature size={20} />
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${doc.status === 'PENDING' ? 'bg-warning-50 text-warning-700' : 'bg-success-50 text-success-700'}`}>
                                    {doc.status}
                                </span>
                            </div>

                            <h4 className="text-xl font-black text-secondary-900 tracking-tight leading-tight">{doc.title}</h4>
                            <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-secondary-400 uppercase tracking-widest">
                                <Clock size={12} /> Issued {new Date(doc.createdAt).toLocaleDateString()}
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button
                                    onClick={() => setViewingDoc(doc)}
                                    className="flex-1 btn bg-secondary-900 text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
                                >
                                    <Eye size={14} /> {doc.status === 'PENDING' ? 'View & Sign' : 'View Snapshot'}
                                </button>
                                <button
                                    onClick={() => {
                                        const w = window.open('', '_blank');
                                        if (w) {
                                            w.document.write(`<html><head><title>${doc.title}</title><style>body { font-family: sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; } .signature { margin-top: 50px; border-top: 1px solid #ccc; padding-top: 20px; }</style></head><body>${doc.content}<div class="signature"><p><strong>Digitally Signed:</strong> ${doc.signedAt ? new Date(doc.signedAt).toLocaleString() : 'Pending'}</p></div></body></html>`);
                                            w.document.close();
                                        }
                                    }}
                                    className="p-3 bg-secondary-100 text-secondary-600 rounded-xl hover:bg-secondary-200 transition-colors"
                                    title="Download Document"
                                    aria-label="Download Document"
                                >
                                    <Download size={16} />
                                </button>
                            </div>
                        </div>
                    ))}

                    {digitalDocs?.length === 0 && (
                        <div className="col-span-full py-40 text-center card-premium border-dashed border-4 border-secondary-100 bg-secondary-50/20">
                            <ShieldCheck size={64} className="mx-auto text-secondary-200 mb-6" />
                            <h3 className="text-2xl font-black text-secondary-900 tracking-tight">System Compliance</h3>
                            <p className="text-secondary-500 font-medium mt-2">All your formal digital compliance paperwork is up to date.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-12 pb-20">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {coreDocs.map((doc, idx) => (
                            <div key={idx} className="card-premium p-8 bg-white border-l-8 border-primary-500 flex flex-col justify-between">
                                <div>
                                    <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center text-3xl mb-6">{doc.icon}</div>
                                    <h3 className="text-xl font-black text-secondary-900 mb-2">{doc.name}</h3>
                                    <p className="text-secondary-500 text-sm mb-6">{doc.description}</p>
                                </div>

                                {doc.url ? (
                                    <a href={doc.url} target="_blank" className="btn btn-primary w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                                        <Download size={16} /> Download
                                    </a>
                                ) : doc.inlineData ? (
                                    <button onClick={() => setViewingDoc({ title: doc.inlineData.title, content: `<h3>${doc.inlineData.title}</h3><p><strong>Package:</strong> ${doc.inlineData.salaryRange}</p><div style="white-space: pre-line; margin-top:20px;">${doc.inlineData.description}</div>`, status: 'CORE' })} className="btn btn-primary w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                                        <Eye size={16} /> View Details
                                    </button>
                                ) : (
                                    <div className="bg-secondary-50 p-4 rounded-xl text-center text-secondary-400 text-[10px] font-bold border border-dashed border-secondary-200 uppercase tracking-widest">Not Available</div>
                                )}
                            </div>
                        ))}
                    </div>

                    {additionalDocs.length > 0 && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-black text-secondary-900 flex items-center gap-2">
                                <FileArchive className="text-primary-600" size={24} />
                                Support Documents & Archives
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {additionalDocs.map((doc: any) => (
                                    <div key={doc.id} className="p-4 rounded-2xl border border-secondary-100 flex items-center gap-4 hover:shadow-md transition-all bg-white group">
                                        <div className="w-10 h-10 bg-secondary-50 group-hover:bg-primary-50 group-hover:text-primary-600 flex items-center justify-center rounded-xl text-xl transition-colors">📄</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-secondary-900 truncate text-sm" title={doc.name}>{doc.name}</p>
                                            <p className="text-[9px] text-secondary-400 font-bold uppercase tracking-tighter">Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                                        </div>
                                        <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-primary-600 hover:text-primary-800 text-xs font-bold">View</a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {viewingDoc && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-secondary-50 flex justify-between items-center bg-secondary-50/30">
                            <div>
                                <h3 className="text-xl font-black text-secondary-900 tracking-tight uppercase tracking-widest text-sm">{viewingDoc.title}</h3>
                                {viewingDoc.id && <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mt-1">Ref ID: {viewingDoc.id.slice(0, 8)}</p>}
                            </div>
                            <button
                                onClick={() => { setViewingDoc(null); setIsSigning(false); }}
                                className="p-2 hover:bg-white rounded-full transition-colors text-secondary-400 hover:text-secondary-900 shadow-sm border border-transparent hover:border-secondary-100"
                                title="Close Preview"
                                aria-label="Close Preview"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-12 bg-[#fcfcfc]">
                            <div className="bg-white shadow-sm border border-secondary-100 p-16 min-h-screen text-secondary-800 leading-relaxed font-serif" dangerouslySetInnerHTML={{ __html: viewingDoc.content }} />
                        </div>

                        <div className="p-8 bg-white border-t border-secondary-50">
                            {viewingDoc.status === 'PENDING' ? (
                                <div className="flex flex-col items-center gap-6">
                                    {!isSigning ? (
                                        <button
                                            onClick={() => setIsSigning(true)}
                                            className="btn bg-primary-600 hover:bg-primary-700 text-white px-16 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-primary-100 animate-in slide-in-from-bottom duration-500"
                                        >
                                            Sign Digitally
                                        </button>
                                    ) : (
                                        <div className="w-full flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
                                            <div className="bg-primary-50 p-6 rounded-[2rem] border border-primary-100 text-center max-w-md">
                                                <p className="text-sm font-bold text-primary-900 mb-4">By clicking confirm, you agree that your digital signature holds the same legal value as a physical signature.</p>
                                                <p className="text-[10px] font-black text-primary-400 uppercase">IP Address and Timestamp will be recorded.</p>
                                            </div>
                                            <div className="flex gap-4">
                                                <button onClick={() => setIsSigning(false)} className="btn bg-secondary-100 text-secondary-600 px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest">Cancel</button>
                                                <button onClick={handleSign} className="btn bg-success-600 hover:bg-success-700 text-white px-12 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-success-100 flex items-center gap-2">
                                                    <CheckCircle2 size={16} /> Confirm Signature
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : viewingDoc.status === 'SIGNED' ? (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="flex items-center gap-3 text-success-600">
                                        <ShieldCheck size={28} />
                                        <p className="text-2xl font-black tracking-tight">Digitally Signed</p>
                                    </div>
                                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.2em] mt-2">
                                        Verified on {new Date(viewingDoc.signedAt).toLocaleString()} • IP: {viewingDoc.signatureIp}
                                    </p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <p className="text-xs font-bold text-secondary-400 uppercase tracking-widest">Formal Document Preview</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

