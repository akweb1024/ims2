import { Info } from 'lucide-react';
import React, { useState } from 'react';

export default function RevenueFlowHelp() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-1 text-[10px] uppercase font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors"
                title="How does revenue tracking work?"
            >
                <Info size={14} />
                <span>How this works</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
                            <h3 className="font-bold text-xl text-gray-900 flex items-center gap-2">
                                <span className="bg-success-100 text-success-600 p-2 rounded-lg">💰</span>
                                Understanding Revenue Flow
                            </h3>
                            <button onClick={() => setIsOpen(false)} className="btn btn-sm btn-ghost rounded-full text-gray-400 hover:text-gray-900">
                                ✕
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* Standard Flow */}
                            <div>
                                <h4 className="font-bold text-indigo-700 uppercase tracking-widest text-xs mb-4">Standard Flow (Recommended)</h4>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black shrink-0">1</div>
                                        <div>
                                            <h5 className="font-bold text-gray-900">Record the Transaction</h5>
                                            <p className="text-sm text-gray-600">Go to <span className="font-mono bg-gray-100 px-1 rounded">Finance &gt; Revenue</span> and create a new transaction entry when you receive client payment.</p>
                                        </div>
                                    </div>
                                    <div className="flex py-2 justify-center">
                                        <div className="h-8 w-0.5 bg-gray-200"></div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black shrink-0">2</div>
                                        <div>
                                            <h5 className="font-bold text-gray-900">Auto-Link in Report</h5>
                                            <p className="text-sm text-gray-600">When you open your &quot;Daily Work Report&quot;, the system will automatically find transactions <b>created by you today</b> and list them under &quot;My Recent Transactions&quot;.</p>
                                        </div>
                                    </div>
                                    <div className="flex py-2 justify-center">
                                        <div className="h-8 w-0.5 bg-gray-200"></div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-success-100 text-success-600 flex items-center justify-center font-black shrink-0">3</div>
                                        <div>
                                            <h5 className="font-bold text-gray-900">Claim & Verify</h5>
                                            <p className="text-sm text-gray-600">Click to add them to your report. Once your manager approves the report, the revenue is officially attributed to your performance stats.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Exception Flow */}
                            <div className="bg-amber-50 p-6 rounded-xl border border-amber-100">
                                <h4 className="font-bold text-amber-700 uppercase tracking-widest text-xs mb-2">Exception: Finance-Recorded Revenue</h4>
                                <p className="text-sm text-amber-800 mb-2">
                                    If the Finance Team recorded the payment (e.g., Bank Transfer), it won&apos;t appear in &quot;My Recent Transactions&quot;.
                                </p>
                                <p className="text-sm font-bold text-amber-900">
                                    👉 Use the &quot;Find Other Revenue&quot; search bar to look up the transaction by Customer Name or Transaction Number.
                                </p>
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 text-right">
                            <button onClick={() => setIsOpen(false)} className="btn btn-primary px-8">Got it!</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
