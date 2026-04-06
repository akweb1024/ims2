import { useState, useEffect } from 'react';
import { AlertOctagon, X } from 'lucide-react';

export default function StaffReimbursementReminder({ onNavigateToReimbursements }: { onNavigateToReimbursements: () => void }) {
    const [showPopup, setShowPopup] = useState(false);

    useEffect(() => {
        const checkReminder = async () => {
            const today = new Date();
            const date = today.getDate();
            
            // Only show between 1st and 7th day of the month
            if (date >= 1 && date <= 7) {
                try {
                    const res = await fetch('/api/reimbursements', {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                    });
                    
                    if (res.ok) {
                        const { data } = await res.json();
                        const curMonth = today.getMonth() + 1;
                        const curYear = today.getFullYear();
                        
                        // Check if submitted for this month
                        const alreadySubmitted = data.some((r: any) => r.month === curMonth && r.year === curYear);
                        if (!alreadySubmitted) {
                            // Optionally, check localStorage to see if user dismissed it for today
                            const dismissedAt = localStorage.getItem(`reimbursement_dismissed_${curMonth}_${curYear}`);
                            if (!dismissedAt || new Date(dismissedAt).getDate() !== date) {
                                setShowPopup(true);
                            }
                        }
                    }
                } catch (err) {
                    console.error('Failed to check reimbursement status');
                }
            }
        };

        checkReminder();
    }, []);

    const handleDismiss = () => {
        const today = new Date();
        localStorage.setItem(`reimbursement_dismissed_${today.getMonth() + 1}_${today.getFullYear()}`, today.toISOString());
        setShowPopup(false);
    };

    if (!showPopup) return null;

    const monthName = new Date().toLocaleString('default', { month: 'long' });

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
                    <h3 className="text-2xl font-black text-secondary-900 tracking-tight mb-2">Reimbursement Time!</h3>
                    <p className="text-secondary-600 mb-6 font-medium leading-relaxed">
                        It&apos;s the first week of <span className="font-bold text-primary-600">{monthName}</span>. Please submit your monthly reimbursement declaration to clear your allowance.
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
