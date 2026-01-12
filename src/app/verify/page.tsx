'use client';

import { useState } from 'react';
import { Search, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function CertificateVerificationPage() {
    const [code, setCode] = useState('');
    const [result, setResult] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResult(null);

        try {
            const res = await fetch(`/api/certificates/verify/${code}`);
            const data = await res.json();
            if (res.ok) {
                setResult(data.certificate);
            } else {
                setError(data.message || 'Verification failed');
            }
        } catch (err) {
            setError('System error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-secondary-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-secondary-900 mb-2">Certificate Verification</h1>
                    <p className="text-secondary-500">Verify the authenticity of a certificate issued by our platform.</p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl p-8 mb-6">
                    <form onSubmit={handleVerify} className="space-y-4">
                        <div>
                            <label className="label">Certificate ID / Code</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 text-secondary-400" size={20} />
                                <input
                                    className="input pl-10 text-center font-mono text-lg uppercase tracking-widest"
                                    placeholder="ABCD-1234-WXYZ"
                                    value={code}
                                    onChange={e => setCode(e.target.value.toUpperCase())}
                                    required
                                />
                            </div>
                        </div>
                        <button disabled={loading} className="btn btn-primary w-full">
                            {loading ? 'Verifying...' : 'Verify Now'}
                        </button>
                    </form>
                </div>

                {result && (
                    <div className="bg-white rounded-3xl shadow-xl p-8 animate-in slide-in-from-bottom-4 border-t-8 border-success-500 text-center">
                        <div className="w-16 h-16 bg-success-100 text-success-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={32} />
                        </div>
                        <h2 className="text-2xl font-black text-secondary-900 mb-1">Valid Certificate</h2>
                        <p className="text-success-600 font-bold mb-6">Verified Authenticated</p>

                        <div className="space-y-4 text-left bg-secondary-50 p-6 rounded-2xl border border-secondary-200">
                            <div>
                                <p className="text-[10px] font-black uppercase text-secondary-400">Recipient</p>
                                <p className="font-bold text-lg text-secondary-900">{result.recipientName}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-secondary-400">Certificate Title</p>
                                <p className="font-bold text-secondary-900">{result.title}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-secondary-400">Description</p>
                                <p className="text-sm text-secondary-600">{result.description}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-secondary-400">Issued On</p>
                                <p className="font-mono text-sm text-secondary-900">{new Date(result.issuedAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="bg-white rounded-3xl shadow-xl p-8 animate-in slide-in-from-bottom-4 border-t-8 border-danger-500 text-center">
                        <div className="w-16 h-16 bg-danger-100 text-danger-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <XCircle size={32} />
                        </div>
                        <h2 className="text-2xl font-black text-secondary-900 mb-1">Invalid Certificate</h2>
                        <p className="text-danger-600 font-bold">Record not found</p>
                    </div>
                )}

                <div className="text-center mt-8">
                    <Link href="/" className="text-secondary-500 hover:text-secondary-900 text-sm font-bold">Back to Home</Link>
                </div>
            </div>
        </div>
    );
}
