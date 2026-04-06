import { useState, useEffect } from 'react';
import FormattedDate from '@/components/common/FormattedDate';

export default function StaffReimbursementView({ fullProfile, user }: { fullProfile: any, user: any }) {
    const [subTab, setSubTab] = useState<'form' | 'history'>('form');
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    
    // Automatically switch to history if there's no salary structure?
    const hasPerks = !!fullProfile?.salaryStructure;
    
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
                    month: new Date().getMonth() + 1,
                    year: new Date().getFullYear()
                })
            });
            
            if (res.ok) {
                setMessage({ type: 'success', text: 'Reimbursement declaration submitted successfully.' });
                fetchRecords();
                setTimeout(() => setSubTab('history'), 2000);
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

    // Calculate details
    const ss = fullProfile?.salaryStructure;
    const perks = [
        { name: 'Health Care', amount: ss?.healthCare || 0 },
        { name: 'Travelling', amount: ss?.travelling || 0 },
        { name: 'Mobile', amount: ss?.mobile || 0 },
        { name: 'Internet', amount: ss?.internet || 0 },
        { name: 'Books & Periodicals', amount: ss?.booksAndPeriodicals || 0 },
    ];
    const totalAmount = perks.reduce((acc, curr) => acc + curr.amount, 0);
    const curMonthName = new Date().toLocaleString('default', { month: 'long' });
    const curYear = new Date().getFullYear();

    const isSubmittedThisMonth = records.some(r => r.month === new Date().getMonth() + 1 && r.year === new Date().getFullYear());

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
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-black text-secondary-900 tracking-tight">Reimbursement Declaration</h2>
                                <p className="text-secondary-500 font-medium">For {curMonthName} {curYear}</p>
                            </div>
                            <div className="bg-primary-50 text-primary-700 px-4 py-2 rounded-xl border border-primary-100 font-bold">
                                ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                        </div>

                        {!hasPerks || totalAmount <= 0 ? (
                            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 text-amber-800 text-center">
                                <h3 className="font-bold text-lg mb-2">No reimbursable perks assigned.</h3>
                                <p className="text-sm opacity-90">Your current salary structure does not include any reimbursable components. Please contact HR.</p>
                            </div>
                        ) : isSubmittedThisMonth ? (
                            <div className="bg-success-50 p-6 rounded-2xl border border-success-200 text-success-800 text-center flex flex-col items-center">
                                <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center text-3xl mb-4">✅</div>
                                <h3 className="font-bold text-lg mb-2">Already Submitted</h3>
                                <p className="text-sm opacity-90">You have already submitted your reimbursement declaration for {curMonthName}.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleFormSubmit} className="space-y-6">
                                {message.text && (
                                    <div className={`p-4 rounded-xl text-sm font-bold ${message.type === 'success' ? 'bg-success-100 text-success-700 border border-success-200' : 'bg-danger-100 text-danger-700 border border-danger-200'}`}>
                                        {message.type === 'success' ? '✅' : '⚠️'} {message.text}
                                    </div>
                                )}

                                <div className="bg-secondary-50 rounded-2xl border border-secondary-100 overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-secondary-100/50">
                                            <tr>
                                                <th className="p-4 text-left font-bold text-secondary-500 uppercase tracking-wider">Perk Category</th>
                                                <th className="p-4 text-right font-bold text-secondary-500 uppercase tracking-wider">Amount Allowed</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-secondary-100 bg-white">
                                            {perks.filter(p => p.amount > 0).map((perk, i) => (
                                                <tr key={i}>
                                                    <td className="p-4 font-semibold text-secondary-900">{perk.name}</td>
                                                    <td className="p-4 text-right font-mono text-secondary-700">
                                                        ₹{perk.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-primary-50">
                                            <tr>
                                                <td className="p-4 font-black text-primary-900">Total Claimable</td>
                                                <td className="p-4 text-right font-black font-mono text-primary-700 text-lg border-t-2 border-primary-200">
                                                    ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 text-amber-900">
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input type="checkbox" required className="mt-1 w-5 h-5 rounded text-primary-600 focus:ring-primary-500 border-amber-300" />
                                        <span className="text-sm font-medium leading-relaxed">
                                            I hereby declare that the amounts mentioned above have been incurred by me for official purposes during the month of {curMonthName} {curYear}. 
                                            I have retained the necessary bills/receipts & will produce the same if demanded. I understand that any false declaration will lead to disciplinary action.
                                        </span>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between pt-6 border-t border-secondary-100">
                                    <div>
                                        <p className="text-xs font-bold text-secondary-400 uppercase tracking-widest mb-1">Digital Signature</p>
                                        {user.signatureUrl ? (
                                            <div className="bg-white border border-secondary-200 p-2 rounded-xl inline-block">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={user.signatureUrl} alt="Signature" className="h-10 object-contain" />
                                            </div>
                                        ) : (
                                            <p className="text-sm text-danger-600 font-bold bg-danger-50 px-3 py-1.5 rounded-lg inline-flex items-center gap-2">
                                                <span className="text-lg">❌</span> Missing in Profile Settings
                                            </p>
                                        )}
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={submitLoading || !user.signatureUrl}
                                        className="btn btn-primary px-8 py-3 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                    >
                                        {submitLoading ? 'Submitting...' : 'Submit Declaration'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {subTab === 'history' && (
                <div className="card-premium overflow-hidden">
                    <div className="p-6 border-b border-secondary-100 flex justify-between items-center bg-secondary-50/50">
                        <h3 className="text-lg font-bold text-secondary-900 line-clamp-1">Submission History</h3>
                        <div className="flex gap-2">
                            <span className="text-xs font-black text-secondary-400 uppercase tracking-widest bg-white px-3 py-1.5 rounded-lg border border-secondary-200 shadow-sm">
                                {records.length} Records
                            </span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center text-sm font-bold text-secondary-400 animate-pulse">Loading...</div>
                    ) : records.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center">
                            <div className="w-16 h-16 bg-secondary-50 rounded-full flex items-center justify-center text-3xl mb-4 border border-secondary-200">📭</div>
                            <h3 className="font-bold text-secondary-900 mb-1">No Past Records Found</h3>
                            <p className="text-sm text-secondary-500">Your historical reimbursement submissions will appear here.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-secondary-50 text-xs uppercase font-black text-secondary-400 tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Submission Date</th>
                                        <th className="px-6 py-4">Filing Period</th>
                                        <th className="px-6 py-4 text-right">Amount Claimed</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4">Signature</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-100">
                                    {records.map((r, i) => {
                                        const monthName = new Date(r.year, r.month - 1).toLocaleString('default', { month: 'short' });
                                        return (
                                            <tr key={i} className="hover:bg-primary-50/30 transition-colors">
                                                <td className="px-6 py-4 font-semibold text-secondary-900">
                                                    <FormattedDate date={r.createdAt} />
                                                </td>
                                                <td className="px-6 py-4 text-secondary-700 font-medium">
                                                    {monthName} {r.year}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono font-bold text-secondary-900">
                                                    ₹{r.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                                        r.status === 'APPROVED' ? 'bg-success-50 text-success-700 border-success-200' : 
                                                        r.status === 'PAID' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                                        'bg-amber-50 text-amber-700 border-amber-200'
                                                    }`}>
                                                        {r.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {r.employeeSignatureUrl ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={r.employeeSignatureUrl} alt="Signature Snapshot" className="h-6 object-contain grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer" title="Signature Snapshot" />
                                                    ) : (
                                                        <span className="text-secondary-300 text-xs font-mono">No Signature</span>
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
