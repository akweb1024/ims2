import { AlertCircle, Clock, Calendar, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function LeaveGuidelines() {
    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-2xl border border-indigo-100">
                <h3 className="text-xl font-black text-indigo-900 mb-2 flex items-center gap-2">
                    <Calendar className="text-indigo-600" size={24} />
                    Leave Balance & Allocation
                </h3>
                <p className="text-sm text-secondary-600 font-medium mb-4">
                    Understanding your leave balance and how it accumulates.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-secondary-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-black">+1.5</span>
                            <h4 className="font-bold text-secondary-900">Monthly Auto-Credit</h4>
                        </div>
                        <p className="text-xs text-secondary-500 font-medium">All active employees automatically receive <span className="font-bold text-emerald-600">1.5 days</span> of leave credited to their balance at the start of every month.</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-secondary-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-black"><CheckCircle2 size={16} /></span>
                            <h4 className="font-bold text-secondary-900">Unified Pool</h4>
                        </div>
                        <p className="text-xs text-secondary-500 font-medium">Your total balance acts as a unified pool, providing flexibility. Certain categories (like casual or sick) represent internal tracking metrics.</p>
                    </div>
                </div>
            </div>

            <div className="bg-gradient-to-br from-rose-50 to-white p-6 rounded-2xl border border-rose-100">
                <h3 className="text-xl font-black text-rose-900 mb-2 flex items-center gap-2">
                    <Clock className="text-rose-600" size={24} />
                    Late Arrivals & Deductions
                </h3>
                <p className="text-sm text-secondary-600 font-medium mb-4">
                    Guidelines for punctuality and the impact of delayed check-ins.
                </p>
                
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-rose-100/50">
                        <div className="mt-0.5">
                            <span className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black">0-30m</span>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-secondary-900">Grace Period (Up to 30 mins)</h4>
                            <p className="text-xs text-secondary-500 mt-1">Arrivals up to 30 minutes late are recorded but do not trigger any immediate leave deduction. Please maintain overall punctuality.</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-rose-100/50">
                        <div className="mt-0.5">
                            <span className="w-6 h-6 rounded bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-black">31-90m</span>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-secondary-900">Late Arrival (31 to 90 mins)</h4>
                            <p className="text-xs text-secondary-500 mt-1 mb-2">Check-ins delayed between 31 and 90 minutes are classified as Late Arrivals.</p>
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
                                <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded">1st & 2nd time: Free (Warning)</span>
                                <span className="bg-rose-50 text-rose-600 px-2 py-1 rounded">3rd time onwards: -0.5 Day</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-white p-6 rounded-2xl border border-orange-100">
                <h3 className="text-xl font-black text-orange-900 mb-2 flex items-center gap-2">
                    <ShieldAlert className="text-orange-600" size={24} />
                    Short Leaves & Early Exits
                </h3>
                <p className="text-sm text-secondary-600 font-medium mb-4">
                    Policy for leaving work early or significant delays.
                </p>
                <div className="bg-white p-4 rounded-xl border border-orange-100/50">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                            <span className="w-6 h-6 rounded bg-rose-100 text-rose-700 flex items-center justify-center text-[10px] font-black">&gt;90m</span>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-secondary-900">Short Leave (More than 90 mins)</h4>
                            <p className="text-xs text-secondary-500 mt-1 mb-3">Checking in over 90 minutes late or checking out over 90 minutes early constitutes a Short Leave.</p>
                            
                            <div className="bg-orange-50/50 p-3 rounded-lg border border-orange-100">
                                <h5 className="text-[10px] font-black text-orange-800 uppercase tracking-widest mb-2">Monthly Allowance</h5>
                                <ul className="space-y-2 text-xs font-medium text-orange-900">
                                    <li className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded bg-white border border-orange-200 flex items-center justify-center text-orange-600 font-black text-[10px]">1</div>
                                        Allowed without penalty
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded bg-white border border-orange-200 flex items-center justify-center text-orange-600 font-black text-[10px]">2</div>
                                        Allowed without penalty (Warning)
                                    </li>
                                    <li className="flex items-center gap-2 mt-2 pt-2 border-t border-orange-200 border-dashed">
                                        <div className="w-4 h-4 rounded bg-rose-500 flex items-center justify-center text-white font-black text-[10px]">3+</div>
                                        <span className="font-bold text-rose-700">0.5 Day Leave Deducted per occurrence</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-secondary-50 p-4 rounded-xl border border-secondary-200 flex items-start gap-3">
                <AlertCircle className="text-secondary-400 mt-0.5" size={18} />
                <div>
                    <h4 className="text-xs font-bold text-secondary-900 uppercase tracking-widest mb-1">Important Note</h4>
                    <p className="text-xs text-secondary-600 font-medium">All counters for late arrivals and short leaves are automatically reset to zero at the beginning of each calendar month. Leave balances carry forward, but negative leave balances (LOP - Loss of Pay) will be adjusted against salary.</p>
                </div>
            </div>
        </div>
    );
}
