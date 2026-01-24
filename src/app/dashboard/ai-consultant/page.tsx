'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import AiConsultantDashboard from '@/components/dashboard/AiConsultantDashboard';
import { Zap, Sparkles, Building2 } from 'lucide-react';

export default function AiConsultantPage() {
    const [userRole, setUserRole] = useState('');

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) {
            setUserRole(JSON.parse(user).role);
        }
    }, []);

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                {/* AI Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 bg-secondary-900 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full -ml-24 -mb-24 blur-3xl"></div>

                    <div className="relative z-10 flex items-center gap-6">
                        <div className="p-5 bg-gradient-to-tr from-primary-500 to-indigo-500 rounded-3xl shadow-lg ring-4 ring-white/10">
                            <Zap className="text-white" size={32} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-primary-400 mb-1">
                                <Sparkles size={16} />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Enterprise Business Intelligence</span>
                            </div>
                            <h1 className="text-4xl font-black text-white tracking-tight">AI Strategy Consultant</h1>
                            <p className="text-secondary-400 mt-2 font-medium max-w-lg">
                                Real-time algorithmic analysis of your company&apos;s financials, employee performance, and market vectors.
                            </p>
                        </div>
                    </div>

                    <div className="relative z-10 flex flex-wrap gap-3">
                        <div className="flex flex-col items-center bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 min-w-[120px]">
                            <span className="text-secondary-400 text-[10px] font-black uppercase mb-1">System Health</span>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                <span className="text-white font-black">OPTIMIZED</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-center bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 min-w-[120px]">
                            <span className="text-secondary-400 text-[10px] font-black uppercase mb-1">Vector Engine</span>
                            <span className="text-white font-black italic">STM-GEN-2.1</span>
                        </div>
                    </div>
                </div>

                {/* Main Dashboard Component */}
                <div className="px-1">
                    <AiConsultantDashboard />
                </div>

                {/* Footer disclaimer */}
                <div className="flex items-center justify-center gap-2 py-8 border-t border-secondary-100">
                    <Building2 size={16} className="text-secondary-300" />
                    <p className="text-xs text-secondary-400 font-bold italic tracking-wide">
                        Powered by Advanced Agentic Business Intelligence v2.0 • Data refreshed in real-time
                    </p>
                </div>
            </div>
        </DashboardLayout>
    );
}
