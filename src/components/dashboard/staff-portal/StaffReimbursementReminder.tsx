import { useState, useEffect } from 'react';
import { AlertOctagon, X } from 'lucide-react';

export default function StaffReimbursementReminder({ onNavigateToReimbursements }: { onNavigateToReimbursements: () => void }) {
    const [showPopup, setShowPopup] = useState(false);
    const [targetMonthLabel, setTargetMonthLabel] = useState('');

    useEffect(() => {
        const checkReminder = async () => {
            const today = new Date();
            const date = today.getDate();
            const month = today.getMonth() + 1; // 1-12
            const year = today.getFullYear();

            // Calculate last day of this month
            const lastDayOfMonth = new Date(year, month, 0).getDate();

            // Window: last 3 days of current month OR first 3 days of next month
            const isLastThreeDays = date >= lastDayOfMonth - 2;
            const isFirstThreeDays = date <= 3;
            const inWindow = isLastThreeDays || isFirstThreeDays;

            if (!inWindow) return;

            // Target month = previous month (reimbursement is always for last month)
            let targetMonth: number;
            let targetYear: number;
            if (isFirstThreeDays) {
                // e.g., April 1-3 → target is the month that just ended (March)
                targetMonth = month === 1 ? 12 : month - 1;
                targetYear = month === 1 ? year - 1 : year;
            } else {
                // e.g., March 28-31 → target is the month that is ending (March)
                targetMonth = month;
                targetYear = year;
            }


            const monthName = new Date(targetYear, targetMonth - 1).toLocaleString('default', { month: 'long' });
            setTargetMonthLabel(`${monthName} ${targetYear}`);

            // Check if already submitted for this target month
            try {
                const res = await fetch('/api/reimbursements', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });

                if (res.ok) {
                    const { data } = await res.json();
                    const alreadySubmitted = data.some((r: any) => r.month === targetMonth && r.year === targetYear);

                    if (!alreadySubmitted) {
                        // Check if dismissed today
                        const dismissKey = `reimb_dismissed_${targetMonth}_${targetYear}`;
                        const dismissedDate = localStorage.getItem(dismissKey);
                        const todayStr = today.toDateString();
                        if (dismissedDate !== todayStr) {
                            setShowPopup(true);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to check reimbursement status');
            }
        };

        checkReminder();
    }, []);

    const handleDismiss = () => {
        const today = new Date();
        const month = today.getMonth() + 1;
        const year = today.getFullYear();

        // Target is prev month
        const targetMonth = month === 1 ? 12 : month - 1;
        const targetYear = month === 1 ? year - 1 : year;

        localStorage.setItem(`reimb_dismissed_${targetMonth}_${targetYear}`, today.toDateString());
        setShowPopup(false);
    };

    if (!showPopup) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 text-secondary-400 hover:text-secondary-600 bg-secondary-50 hover:bg-secondary-100 p-2 rounded-full transition-colors z-10"
                >
                    <X size={20} />
                </button>

                <div className="h-32 bg-primary-600 relative flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center text-3xl font-black text-primary-600 border-4 border-primary-100 z-10">
                        🧾
                    </div>
                </div>

                <div className="p-8 text-center bg-white relative -mt-6 rounded-t-3xl shadow-[0_-15px_30px_rgba(0,0,0,0.05)]">
                    <h3 className="text-2xl font-black text-secondary-900 tracking-tight mb-2">Reimbursement Due!</h3>
                    <p className="text-secondary-600 mb-6 font-medium leading-relaxed">
                        Please submit your reimbursement declaration for{' '}
                        <span className="font-bold text-primary-600">{targetMonthLabel}</span>.{' '}
                        Deadline is approaching — don&apos;t miss it!
                    </p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => {
                                setShowPopup(false);
                                onNavigateToReimbursements();
                            }}
                            className="btn btn-primary w-full py-4 rounded-xl text-sm font-black shadow-lg shadow-primary-200/50 hover:-translate-y-1 hover:shadow-xl transition-all"
                        >
                            Open Declaration Form 📝
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="text-xs font-bold text-secondary-400 uppercase tracking-widest hover:text-secondary-600 hover:underline p-2"
                        >
                            Remind me tomorrow
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
