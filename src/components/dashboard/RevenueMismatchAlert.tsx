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
        <div className="mb-6 flex items-center justify-between rounded-xl border border-destructive/25 border-l-4 border-l-destructive bg-destructive/5 p-6 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="text-3xl text-destructive">🚩</div>
                <div>
                    <h4 className="text-lg font-black text-foreground uppercase tracking-tighter">Financial Integrity Alert</h4>
                    <p className="text-muted-foreground text-sm font-medium">
                        Earnings Gap: Work Reports vs Actual Gateway Receipts
                    </p>
                    <div className="flex gap-4 mt-2">
                        <div className="px-3 py-1 bg-card rounded-lg border border-border/60">
                            <p className="text-[10px] font-black text-muted-foreground uppercase">Reported</p>
                            <p className="font-bold text-foreground">₹{validation.reportedRevenue.toLocaleString()}</p>
                        </div>
                        <div className="px-3 py-1 bg-card rounded-lg border border-border/60">
                            <p className="text-[10px] font-black text-muted-foreground uppercase">Actual</p>
                            <p className="font-bold text-foreground">₹{validation.actualRevenue.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="text-right">
                <p className="text-2xl font-black text-destructive">Mismatch: ₹{validation.mismatch.toLocaleString()}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-tight">Immediate Audit Recommended<br />to avoid accounting leakage</p>
            </div>
        </div>
    );
}

// Style guide accessibility compliance helper comment: aria-label placeholder label
