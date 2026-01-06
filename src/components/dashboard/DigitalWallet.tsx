'use client';

import { useState, useEffect } from 'react';
import { FileText, CheckCircle, Clock, PenTool } from 'lucide-react';

export default function DigitalWallet() {
    const [docs, setDocs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [signingId, setSigningId] = useState<string | null>(null);

    useEffect(() => {
        fetchDocs();
    }, []);

    const fetchDocs = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/hr/documents/my-digital', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setDocs(await res.json());
        setLoading(false);
    };

    const handleSign = async (id: string) => {
        if (!confirm('I hereby confirm to digitally sign this document. This action cannot be undone.')) return;
        setSigningId(id);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/documents/issue', { // We use issue endpoint PATCH method for signing
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action: 'SIGN' })
            });

            if (res.ok) {
                fetchDocs();
                alert('Document Signed Successfully!');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSigningId(null);
        }
    };

    if (loading) return <div className="text-center animate-pulse py-10">Fetching your secured documents...</div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {docs.length === 0 ? (
                    <div className="col-span-full text-center py-20 bg-secondary-50 rounded-2xl border border-dashed border-secondary-200">
                        <FileText size={48} className="mx-auto text-secondary-300 mb-4" />
                        <h3 className="text-secondary-500 font-bold">No Digital Documents Issued</h3>
                        <p className="text-xs text-secondary-400">Once HR issues your Offer Letter or Contracts, they will appear here.</p>
                    </div>
                ) : docs.map(doc => (
                    <div key={doc.id} className="card bg-white border border-secondary-100 p-0 overflow-hidden group hover:border-primary-200 transition-all">
                        <div className="p-6 border-b border-secondary-50">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-xl ${doc.status === 'SIGNED' ? 'bg-success-50 text-success-600' : 'bg-warning-50 text-warning-600'}`}>
                                    {doc.status === 'SIGNED' ? <CheckCircle size={24} /> : <Clock size={24} />}
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${doc.status === 'SIGNED' ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'}`}>
                                    {doc.status}
                                </span>
                            </div>
                            <h3 className="font-bold text-lg text-secondary-900 line-clamp-2">{doc.title}</h3>
                            <p className="text-xs text-secondary-400 mt-1">Issued: {new Date(doc.createdAt).toLocaleDateString()}</p>
                            {doc.signedAt && <p className="text-xs text-success-600 mt-1">Signed: {new Date(doc.signedAt).toLocaleDateString()}</p>}
                        </div>

                        {/* CONTENT PREVIEW */}
                        <div className="bg-secondary-50/50 p-4 max-h-40 overflow-y-auto text-[10px] text-secondary-500 font-mono">
                            <div dangerouslySetInnerHTML={{ __html: doc.content }} />
                        </div>

                        <div className="p-4 bg-secondary-50 flex gap-2">
                            {/* In a real app, View would open a Modal with full HTML printable view */}
                            <button onClick={() => {
                                const w = window.open('', '_blank');
                                if (w) {
                                    w.document.write(`<html><head><title>${doc.title}</title><style>body { font-family: sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; } .signature { margin-top: 50px; border-top: 1px solid #ccc; padding-top: 20px; }</style></head><body>
                                        ${doc.content}
                                        <div class="signature">
                                            <p><strong>Digitally Signed by:</strong> ${doc.employee?.user?.email || 'Employee'}</p>
                                            <p><strong>Date:</strong> ${doc.signedAt ? new Date(doc.signedAt).toLocaleString() : 'Not Signed'}</p>
                                            <p><strong>Status:</strong> ${doc.status}</p>
                                            <p><strong>Reference ID:</strong> ${doc.id}</p>
                                        </div>
                                    </body></html>`);
                                    w.document.close();
                                }
                            }} className="btn btn-sm btn-outline flex-1">View / Print</button>

                            {doc.status !== 'SIGNED' && (
                                <button
                                    onClick={() => handleSign(doc.id)}
                                    disabled={!!signingId}
                                    className="btn btn-sm btn-primary flex-1 flex items-center justify-center gap-2"
                                >
                                    {signingId === doc.id ? 'Signing...' : <><PenTool size={12} /> Sign Now</>}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
