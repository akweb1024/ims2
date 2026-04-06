import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import FormattedDate from '@/components/common/FormattedDate';

export default function StaffReimbursementView({ fullProfile, user, onUpdateUser }: { fullProfile: any, user: any, onUpdateUser?: () => void }) {
    const [subTab, setSubTab] = useState<'form' | 'history'>('form');
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [selectedYear, setSelectedYear] = useState(currentYear);

    // Get salary structure limits
    const ss = fullProfile?.salaryStructure || {};
    const perkLimits = useMemo(() => ({
        healthCare: ss.healthCare || 0,
        travelling: ss.travelling || 0,
        mobile: ss.mobile || 0,
        internet: ss.internet || 0,
        booksAndPeriodicals: ss.booksAndPeriodicals || 0,
    }), [ss.healthCare, ss.travelling, ss.mobile, ss.internet, ss.booksAndPeriodicals]);

    const [perkAmounts, setPerkAmounts] = useState({
        healthCare: perkLimits.healthCare,
        travelling: perkLimits.travelling,
        mobile: perkLimits.mobile,
        internet: perkLimits.internet,
        booksAndPeriodicals: perkLimits.booksAndPeriodicals,
    });

    // Reset amounts if profile changes
    useEffect(() => {
        setPerkAmounts({
            healthCare: perkLimits.healthCare,
            travelling: perkLimits.travelling,
            mobile: perkLimits.mobile,
            internet: perkLimits.internet,
            booksAndPeriodicals: perkLimits.booksAndPeriodicals,
        });
    }, [fullProfile, perkLimits]);

    const handleAmountChange = (category: string, value: string) => {
        const val = parseFloat(value) || 0;
        const limit = (perkLimits as any)[category] || 0;
        setPerkAmounts(prev => ({ 
            ...prev, 
            [category]: Math.min(val, limit) 
        }));
    };

    const totalAmount = Object.values(perkAmounts).reduce((acc, curr) => acc + curr, 0);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/reimbursements', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRecords(data.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, []);

    const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (uploadRes.ok) {
                const { url } = await uploadRes.json();
                const signatureRes = await fetch('/api/profile/signature', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ signatureUrl: url })
                });

                if (signatureRes.ok) {
                    setMessage({ type: 'success', text: 'Signature uploaded successfully.' });
                    if (onUpdateUser) onUpdateUser(); // Refresh parent user state
                } else {
                    setMessage({ type: 'error', text: 'Failed to save signature link.' });
                }
            } else {
                setMessage({ type: 'error', text: 'Upload failed.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Network connection error.' });
        } finally {
            setUploading(false);
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });
        setSubmitLoading(true);

        try {
            const res = await fetch('/api/reimbursements', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    month: selectedMonth,
                    year: selectedYear,
                    perks: perkAmounts
                })
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Reimbursement declaration submitted successfully.' });
                fetchRecords();
                setTimeout(() => {
                    setSubTab('history');
                    setMessage({ type: '', text: '' });
                }, 2000);
            } else {
                const err = await res.json();
                setMessage({ type: 'error', text: err.error || 'Failed to submit.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Network Error.' });
        } finally {
            setSubmitLoading(false);
        }
    };

    const selMonthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' });
    const isSubmittedThisMonth = records.some(r => r.month === selectedMonth && r.year === selectedYear);

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const years = [currentYear, currentYear - 1];

    const hasAnyLimit = Object.values(perkLimits).some(v => v > 0);

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex bg-secondary-50 p-1.5 rounded-2xl w-fit border border-secondary-100">
                    <button 
                        onClick={() => setSubTab('form')} 
                        className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${subTab === 'form' ? 'bg-primary-600 text-white shadow-md transform scale-105' : 'text-secondary-500 hover:text-primary-600 hover:bg-primary-50'}`}
                    >
                        <span className="text-lg">🧾</span> New Declaration
                    </button>
                    <button 
                        onClick={() => setSubTab('history')} 
                        className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${subTab === 'history' ? 'bg-primary-600 text-white shadow-md transform scale-105' : 'text-secondary-500 hover:text-primary-600 hover:bg-primary-50'}`}
                    >
                        <span className="text-lg">📜</span> History
                    </button>
                </div>
            </div>

            {subTab === 'form' && (
                <div className="max-w-3xl mx-auto card-premium overflow-hidden border-t-8 border-t-primary-500">
                    <div className="p-8 pb-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                            <div>
                                <h2 className="text-3xl font-black text-secondary-900 tracking-tight leading-none mb-2">Reimbursement Filing</h2>
                                <p className="text-secondary-500 font-medium tracking-wide">Filing for period: <span className="text-primary-600 font-bold">{selMonthName} {selectedYear}</span></p>
                            </div>
                            <div className="flex items-center gap-3 bg-secondary-50 p-2 rounded-2xl border border-secondary-100">
                                <select 
                                    value={selectedMonth} 
                                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                    className="select select-sm font-bold h-10 rounded-xl"
                                >
                                    {months.map((m, i) => (
                                        <option key={i} value={i + 1}>{m}</option>
                                    ))}
                                </select>
                                <select 
                                    value={selectedYear} 
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                    className="select select-sm font-bold h-10 rounded-xl"
                                >
                                    {years.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {!hasAnyLimit ? (
                            <div className="bg-amber-50 p-8 rounded-3xl border border-amber-200 text-amber-900 text-center flex flex-col items-center">
                                <div className="text-5xl mb-4">⚠️</div>
                                <h3 className="font-black text-xl mb-2 tracking-tight">No Allowances Found</h3>
                                <p className="text-sm opacity-80 max-w-sm">Your salary structure doesn&apos;t seem to include any reimbursable components. Please contact HR to update your perk settings.</p>
                            </div>
                        ) : isSubmittedThisMonth ? (
                            <div className="bg-success-50 p-10 rounded-3xl border border-success-200 text-success-800 text-center flex flex-col items-center">
                                <div className="w-20 h-20 bg-success-100 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner animate-bounce">✓</div>
                                <h3 className="font-black text-2xl mb-2 tracking-tight">Already Documented</h3>
                                <p className="text-base opacity-90 max-w-sm">You have already submitted your reimbursement claim for {selMonthName}. Check the History tab for details.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleFormSubmit} className="space-y-8">
                                {message.text && (
                                    <div className={`p-5 rounded-2xl text-sm font-bold animate-in slide-in-from-top-2 flex items-center gap-3 ${message.type === 'success' ? 'bg-success-100 text-success-700 border border-success-200' : 'bg-danger-100 text-danger-700 border border-danger-200'}`}>
                                        <span className="text-lg">{message.type === 'success' ? '✅' : '⚠️'}</span> {message.text}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.2em] ml-1">Expense Breakdown</p>
                                    <div className="grid gap-4">
                                        {[
                                            { id: 'healthCare', label: 'Health Care Allowance', limit: perkLimits.healthCare },
                                            { id: 'travelling', label: 'Travelling Allowance', limit: perkLimits.travelling },
                                            { id: 'mobile', label: 'Mobile Allowance', limit: perkLimits.mobile },
                                            { id: 'internet', label: 'Internet Allowance', limit: perkLimits.internet },
                                            { id: 'booksAndPeriodicals', label: 'Books & Periodicals', limit: perkLimits.booksAndPeriodicals },
                                        ].filter(p => p.limit > 0).map((perk, i) => (
                                            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white border border-secondary-100 rounded-2xl hover:border-primary-200 hover:shadow-sm transition-all group">
                                                <div>
                                                    <h4 className="font-bold text-secondary-900 group-hover:text-primary-700 transition-colors">{perk.label}</h4>
                                                    <p className="text-xs text-secondary-400 font-medium">Monthly Limit: ₹{perk.limit.toLocaleString()}</p>
                                                </div>
                                                <div className="mt-3 sm:mt-0 relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400 font-bold">₹</span>
                                                    <input 
                                                        type="number"
                                                        max={perk.limit}
                                                        min="0"
                                                        step="0.01"
                                                        value={(perkAmounts as any)[perk.id]}
                                                        onChange={(e) => handleAmountChange(perk.id, e.target.value)}
                                                        className="input input-sm w-full sm:w-40 pl-8 pr-4 font-mono font-bold text-right text-lg h-12 bg-secondary-50 border-secondary-100 focus:bg-white focus:ring-primary-500 rounded-xl"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-primary-600 p-6 rounded-2xl shadow-xl shadow-primary-200 flex items-center justify-between text-white">
                                    <span className="font-bold text-primary-100 uppercase tracking-widest text-[10px]">Total Claim Amount</span>
                                    <span className="text-3xl font-black font-mono">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>

                                <div className="bg-amber-50 p-6 rounded-3xl border border-amber-200 text-amber-900">
                                    <label className="flex items-start gap-4 cursor-pointer">
                                        <input type="checkbox" required className="mt-1 w-6 h-6 rounded-lg text-primary-600 focus:ring-primary-500 border-amber-300 transition-all cursor-pointer" />
                                        <span className="text-sm font-semibold leading-relaxed">
                                            I hereby declare that I have incurred ₹{totalAmount.toLocaleString()} for the official allowances selected above during <span className="bg-amber-200/50 px-1.5 rounded">{selMonthName} {selectedYear}</span>. I have the necessary receipts and agree that false declarations may lead to disciplinary action.
                                        </span>
                                    </label>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center justify-between gap-8 pt-8 border-t border-secondary-100">
                                    <div className="w-full sm:w-auto">
                                        <p className="text-[10px] font-black text-secondary-400 uppercase tracking-[0.2em] mb-2">Authenticated Signature</p>
                                        {user.signatureUrl ? (
                                            <div className="bg-white border-2 border-dashed border-secondary-200 p-4 rounded-3xl inline-block shadow-sm group hover:border-primary-300 transition-all">
                                                <Image 
                                                    src={user.signatureUrl} 
                                                    alt="Signature" 
                                                    width={128} 
                                                    height={64} 
                                                    unoptimized 
                                                    className="h-16 w-32 object-contain group-hover:scale-105 transition-transform" 
                                                />
                                                <p className="text-[9px] text-secondary-300 font-bold uppercase text-center mt-2 tracking-tighter">Profile Signature Found</p>
                                            </div>
                                        ) : (
                                            <div className="relative group overflow-hidden bg-white border-2 border-dashed border-danger-200 p-6 rounded-3xl w-full sm:w-64 flex flex-col items-center text-center">
                                                <div className="text-3xl mb-2">{uploading ? '⏳' : '✍️'}</div>
                                                <p className="text-xs font-bold text-danger-600 mb-2">{uploading ? 'Processing...' : 'Signature Required'}</p>
                                                <label className="btn btn-xs btn-outline btn-danger rounded-lg cursor-pointer">
                                                    {uploading ? 'Uploading...' : 'Upload Now'}
                                                    <input type="file" className="hidden" accept="image/*" onChange={handleSignatureUpload} disabled={uploading} />
                                                </label>
                                            </div>
                                        )}
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={submitLoading || !user.signatureUrl || totalAmount <= 0}
                                        className="btn btn-primary w-full sm:w-auto px-12 py-4 rounded-3xl shadow-2xl shadow-primary-200 hover:shadow-primary-300 hover:-translate-y-1 transition-all font-black text-xl disabled:opacity-50 disabled:grayscale disabled:transform-none"
                                    >
                                        {submitLoading ? (
                                            <span className="flex items-center gap-2">
                                                <span className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                Submitting...
                                            </span>
                                        ) : 'Save Declaration'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {subTab === 'history' && (
                <div className="card-premium overflow-hidden border-t-8 border-t-secondary-400">
                    <div className="p-8 border-b border-secondary-100 flex justify-between items-center bg-secondary-50/50">
                        <div>
                            <h3 className="text-2xl font-black text-secondary-900 tracking-tight">Submission Audit</h3>
                            <p className="text-xs font-bold text-secondary-400 uppercase tracking-widest mt-1">Verified Historical Records</p>
                        </div>
                        <span className="bg-primary-600 text-white px-5 py-2 rounded-2xl font-black text-sm shadow-lg shadow-primary-100">
                            {records.length} Submissions
                        </span>
                    </div>

                    {loading ? (
                        <div className="p-20 text-center flex flex-col items-center">
                            <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mb-4"></div>
                            <p className="text-sm font-black text-secondary-400 uppercase tracking-widest">Retrieving Records...</p>
                        </div>
                    ) : records.length === 0 ? (
                        <div className="p-20 text-center flex flex-col items-center text-secondary-300">
                            <div className="text-6xl mb-6 opacity-20">📂</div>
                            <h3 className="font-black text-2xl text-secondary-900 mb-2">History Empty</h3>
                            <p className="text-sm font-medium text-secondary-400 max-w-xs mx-auto">Your verified reimbursement submissions from past months will be indexed and stored here.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-secondary-100/30 text-[10px] uppercase font-black text-secondary-400 tracking-[0.2em]">
                                    <tr>
                                        <th className="px-8 py-5">Date Filed</th>
                                        <th className="px-8 py-5">Period</th>
                                        <th className="px-8 py-5 text-right">Total Claim</th>
                                        <th className="px-8 py-5 text-center">Status</th>
                                        <th className="px-8 py-5">Auth Signature</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-100">
                                    {records.map((r, i) => {
                                        const monthName = new Date(r.year, r.month - 1).toLocaleString('default', { month: 'short' });
                                        return (
                                            <tr key={i} className="hover:bg-primary-50/40 transition-all group">
                                                <td className="px-8 py-6 font-bold text-secondary-900">
                                                    <FormattedDate date={r.createdAt} />
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="bg-secondary-100/50 px-3 py-1.5 rounded-xl inline-block font-black text-[11px] text-secondary-700">
                                                        {monthName} {r.year}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right font-mono font-black text-secondary-900 text-lg">
                                                    ₹{r.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <span className={`inline-flex px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm ${
                                                        r.status === 'APPROVED' ? 'bg-success-500 text-white shadow-success-200' : 
                                                        r.status === 'PAID' ? 'bg-primary-600 text-white shadow-primary-200' :
                                                        'bg-amber-400 text-white shadow-amber-200'
                                                    }`}>
                                                        {r.status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    {r.employeeSignatureUrl ? (
                                                        <div className="bg-white p-2 rounded-xl border border-secondary-100 shadow-sm inline-block group-hover:scale-110 group-hover:shadow-md transition-all">
                                                            <Image 
                                                                src={r.employeeSignatureUrl} 
                                                                alt="Auth Signature" 
                                                                width={64} 
                                                                height={32} 
                                                                unoptimized
                                                                className="h-8 w-16 object-contain grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all" 
                                                            />
                                                        </div>
                                                    ) : (
                                                        <span className="text-secondary-300 text-[10px] font-black uppercase tracking-widest">Digital Auth Only</span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
