import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import CRMMetrics from './CRMMetrics';
import RecentActivities from './RecentActivities';
import CustomerGrowthChart from './CustomerGrowthChart';
import AlertsPanel from './AlertsPanel';
import CRMClientLayout from './CRMClientLayout';
import LeadAssignmentSettings from './LeadAssignmentSettings';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { prisma } from '@/lib/prisma';
import { CRMPageShell } from '@/components/crm/CRMPageShell';
import { LayoutDashboard, TrendingUp, History, Bell, Calendar, IndianRupee, Sparkles, Zap, ShieldCheck, Activity } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function CRMDashboardPage() {
    const user = await getAuthenticatedUser();

    if (!user) {
        redirect('/login');
    }

    // Fetch Growth Data (Last 6 Months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1); // Start of month

    const isGlobal = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(user.role);
    const filter = isGlobal ? {} : { assignedToUserId: user.id };

    const customers = await prisma.customerProfile.findMany({
        where: { 
            createdAt: { gte: sixMonthsAgo },
            ...filter
        },
        select: { createdAt: true }
    });

    // Group by month
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const growthDataMap: Record<string, number> = {};
    
    // Initialize last 6 months with 0
    for (let i = 0; i < 6; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        growthDataMap[months[d.getMonth()]] = 0;
    }

    customers.forEach(ps => {
        if (ps.createdAt) {
            const m = months[new Date(ps.createdAt).getMonth()];
            if (growthDataMap[m] !== undefined) growthDataMap[m]++;
        }
    });

    const chartData = Object.entries(growthDataMap)
        .map(([name, customers]) => ({ name, customers }))
        .reverse();

    return (
        <CRMClientLayout>
            <CRMPageShell
                title="CRM Overview"
                subtitle="See what needs attention today and move work from lead to deal to customers."
                icon={<LayoutDashboard className="w-5 h-5" />}
                breadcrumb={[{ label: 'CRM', href: '/dashboard/crm' }, { label: 'Overview' }]}
                actions={
                    <div className="flex items-center gap-3">
                         <div className="hidden lg:flex items-center gap-3 bg-secondary-950 px-4 py-2 rounded-2xl border border-white/5 shadow-inner">
                             <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Live overview</span>
                             </div>
                             <div className="h-4 w-px bg-white/10" />
                             <span className="text-[9px] font-black uppercase tracking-widest text-secondary-400 opacity-60">Status: active</span>
                         </div>
                         <Link href="/dashboard/crm/leads" className="bg-primary-600 text-white px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary-200 hover:bg-primary-700 transition-all flex items-center gap-3 active:scale-95 group">
                            <Zap size={16} className="text-primary-200 group-hover:animate-bounce" />
                            Open lead
                         </Link>
                    </div>
                }
            >
                <div className="space-y-10 pb-20">
                    <Suspense fallback={
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                             {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-secondary-50 animate-pulse rounded-[2.5rem] border border-secondary-100" />)}
                        </div>
                    }>
                        <CRMMetrics user={user} />
                    </Suspense>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Link href="/dashboard/crm/leads" className="bg-white p-7 rounded-[2.5rem] border border-secondary-100 shadow-xl shadow-secondary-100/40 hover:-translate-y-1 transition-all">
                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary-500 mb-3">Step 1</p>
                            <h3 className="text-xl font-black text-secondary-950">Lead</h3>
                            <p className="text-sm text-secondary-500 mt-2">Add and qualify people or companies your team may sell to.</p>
                        </Link>
                        <Link href="/dashboard/crm/deals" className="bg-white p-7 rounded-[2.5rem] border border-secondary-100 shadow-xl shadow-secondary-100/40 hover:-translate-y-1 transition-all">
                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-500 mb-3">Step 2</p>
                            <h3 className="text-xl font-black text-secondary-950">Deal</h3>
                            <p className="text-sm text-secondary-500 mt-2">Track active sales chances, expected close dates, and deal value.</p>
                        </Link>
                        <Link href="/dashboard/customers" className="bg-white p-7 rounded-[2.5rem] border border-secondary-100 shadow-xl shadow-secondary-100/40 hover:-translate-y-1 transition-all">
                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500 mb-3">Step 3</p>
                            <h3 className="text-xl font-black text-secondary-950">Customers</h3>
                            <p className="text-sm text-secondary-500 mt-2">Manage active accounts, subscriptions, billing, and follow-up.</p>
                        </Link>
                    </div>

                    <LeadAssignmentSettings />

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        <div className="lg:col-span-8 space-y-10">
                            <div className="bg-secondary-950 p-8 md:p-12 rounded-[4rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                                <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-primary-600/10 to-transparent pointer-events-none" />
                                <div className="absolute -bottom-10 -right-10 opacity-5 blur-2xl group-hover:scale-150 transition-transform duration-1000">
                                     <TrendingUp size={300} className="text-white" />
                                </div>
                                <div className="flex flex-col sm:flex-row items-center justify-between mb-12 relative z-10 gap-6">
                                    <div className="flex items-center gap-6">
                                         <div className="w-14 h-14 bg-white/5 rounded-[1.5rem] flex items-center justify-center text-primary-400 group-hover:rotate-12 transition-transform">
                                              <TrendingUp size={32} />
                                         </div>
                                         <div>
                                              <h3 className="text-xl font-black text-white uppercase tracking-tight italic leading-tight">Customer growth</h3>
                                              <p className="text-[10px] font-black text-primary-400 uppercase tracking-[0.4em] mt-2">New customers added in the last 6 months</p>
                                         </div>
                                    </div>
                                    <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
                                         <button className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-primary-600 text-white shadow-2xl shadow-primary-900 transition-all">Trend</button>
                                         <button className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-white/40 hover:text-white transition-all uppercase italic">History</button>
                                    </div>
                                </div>
                                <div className="h-[420px] relative z-10 -ml-2 group-hover:translate-y-[-5px] transition-transform duration-700">
                                    <CustomerGrowthChart data={chartData} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                 <div className="bg-white p-8 rounded-[3rem] border border-secondary-100 shadow-xl shadow-secondary-100/50 flex items-center gap-6 group hover:translate-y-[-4px] transition-all">
                                      <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center transition-all group-hover:bg-emerald-600 group-hover:text-white">
                                           <ShieldCheck size={28} />
                                      </div>
                                      <div>
                                           <p className="text-[9px] font-black text-emerald-700/60 uppercase tracking-widest pl-0.5 mb-1.5">Team status</p>
                                           <h4 className="text-lg font-black text-secondary-950 uppercase tracking-tight italic">Workflows on track</h4>
                                      </div>
                                 </div>
                                 <div className="bg-white p-8 rounded-[3rem] border border-secondary-100 shadow-xl shadow-secondary-100/50 flex items-center gap-6 group hover:translate-y-[-4px] transition-all">
                                      <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center transition-all group-hover:bg-indigo-600 group-hover:text-white">
                                           <Activity size={28} />
                                      </div>
                                      <div>
                                           <p className="text-[9px] font-black text-indigo-700/60 uppercase tracking-widest pl-0.5 mb-1.5">CRM activity</p>
                                           <h4 className="text-lg font-black text-secondary-950 uppercase tracking-tight italic">Live updates active</h4>
                                      </div>
                                 </div>
                            </div>
                        </div>

                        <div className="lg:col-span-4 space-y-10">
                            <Suspense fallback={<div className="h-96 bg-danger-50 animate-pulse rounded-[4rem]" />}>
                                <AlertsPanel user={user} />
                            </Suspense>

                            <div className="bg-white p-8 md:p-10 rounded-[4rem] border border-secondary-100 shadow-2xl shadow-secondary-100/50 overflow-hidden relative group">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:translate-x-[-10px] group-hover:translate-y-[10px] transition-transform duration-1000">
                                     <History size={120} />
                                </div>
                                <div className="flex items-center gap-5 mb-10 relative z-10 border-b border-secondary-100 pb-8">
                                    <div className="w-14 h-14 rounded-[1.5rem] bg-secondary-950 text-white flex items-center justify-center shrink-0 shadow-2xl shadow-secondary-950/20 group-hover:rotate-[-5deg] transition-all duration-700">
                                        <History size={24} />
                                    </div>
                                    <div className="flex flex-col">
                                         <h3 className="text-xl font-black text-secondary-950 uppercase tracking-tight italic leading-tight">Recent activity</h3>
                                         <p className="text-[9px] font-black text-secondary-400 uppercase tracking-[0.4em] mt-2 italic leading-tight">Latest follow-ups and CRM updates.</p>
                                    </div>
                                </div>
                                <div className="relative z-10">
                                    <Suspense fallback={
                                        <div className="space-y-6">
                                             {[1, 2, 3].map(i => <div key={i} className="h-20 bg-secondary-50 animate-pulse rounded-2xl" />)}
                                        </div>
                                    }>
                                        <RecentActivities user={user} />
                                    </Suspense>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </CRMPageShell>
        </CRMClientLayout>
    );
}
