'use client';

import { useState, useEffect } from 'react';

export default function RevenueMismatchAlert() {
    const [validation, setValidation] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkValidation = async () => {
            try {
                const res = await fetch(`/api/finance/validate-revenue?date=${new Date().toISOString().split('T')[0]}`);
                if (res.ok) {
                    const data = await res.json();
                    if (!data.isValid) {
                        setValidation(data);
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        checkValidation();
    }, []);

    if (loading || !validation) return null;

    return (
        <div className="card-premium bg-rose-50 border-rose-200 border-l-8 border-rose-500 p-6 flex justify-between items-center animate-pulse mb-6 shadow-lg">
            <div className="flex items-center gap-4">
                <div className="text-3xl text-rose-600">🚩</div>
                <div>
                    <h4 className="text-lg font-black text-rose-900 uppercase tracking-tighter">Financial Integrity Alert</h4>
                    <p className="text-rose-700 text-sm font-medium">
                        Earnings Gap: Work Reports vs Actual Gateway Receipts
                    </p>
                    <div className="flex gap-4 mt-2">
                        <div className="px-3 py-1 bg-white rounded-lg border border-rose-100">
                            <p className="text-[10px] font-black text-rose-300 uppercase">Reported</p>
                            <p className="font-bold text-rose-900">₹{validation.reportedRevenue.toLocaleString()}</p>
                        </div>
                        <div className="px-3 py-1 bg-white rounded-lg border border-rose-100">
                            <p className="text-[10px] font-black text-rose-300 uppercase">Actual</p>
                            <p className="font-bold text-rose-900">₹{validation.actualRevenue.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="text-right">
                <p className="text-2xl font-black text-rose-600">Mismatch: ₹{validation.mismatch.toLocaleString()}</p>
                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest leading-tight">Immediate Audit Recommended<br />to avoid accounting leakage</p>
            </div>
        </div>
    );
}
