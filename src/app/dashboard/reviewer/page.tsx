'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    LayoutDashboard,
    BookOpen,
    Clock,
    CheckCircle,
    AlertTriangle,
    ChevronRight,
    Award,
    History,
    Calendar,
    ArrowUpRight,
    FileText,
    ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';

export default function ReviewerDashboardPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string>('');

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/reviewer/dashboard', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setData(await res.json());
            }
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    if (loading) return (
        <DashboardLayout userRole={userRole}>
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        </DashboardLayout>
    );

    if (!data?.isReviewer) return (
        <DashboardLayout userRole={userRole}>
            <div className="max-w-4xl mx-auto p-12 text-center bg-white rounded-[3rem] border border-secondary-100 shadow-sm mt-10">
                <ShieldCheck size={64} className="mx-auto mb-6 text-secondary-200" />
                <h1 className="text-3xl font-black text-secondary-900 mb-4">Not Registered as a Reviewer</h1>
                <p className="text-secondary-600 max-w-md mx-auto mb-8">
                    You currently don&apos;t have an active reviewer profile. If you&apos;re a subject matter expert, please contact an editor to be recruited into the pool.
                </p>
                <Link href="/dashboard" className="btn btn-primary px-10">Return to Dashboard</Link>
            </div>
        </DashboardLayout>
    );

    const { statistics, recentAssignments, upcomingDeadlines } = data;

    return (
        <DashboardLayout userRole={userRole}>
            <div className="max-w-7xl mx-auto space-y-8 pb-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">Reviewer Central</h1>
                        <p className="text-secondary-500">Manage your manuscript evaluations and editorial contributions.</p>
                    </div>
                    <Link href="/dashboard/reviewer/certificates" className="btn btn-secondary flex items-center gap-2 px-6 h-12 rounded-2xl bg-white border-primary-200 text-primary-700 hover:bg-primary-50">
                        <Award size={20} /> My Certificates
                    </Link>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Pending Action', count: statistics.pending + statistics.inProgress, icon: Clock, color: 'text-warning-600', bg: 'bg-warning-50' },
                        { label: 'Completed Reviews', count: statistics.validated, icon: CheckCircle, color: 'text-success-600', bg: 'bg-success-50' },
                        { label: 'Total Assigned', count: statistics.total, icon: BookOpen, color: 'text-primary-600', bg: 'bg-primary-50' },
                        { label: 'Certificates Earned', count: statistics.certificates, icon: Award, color: 'text-purple-600', bg: 'bg-purple-50' }
                    ].map((stat, i) => (
                        <div key={i} className="card-premium p-6 bg-white border border-secondary-100 group hover:border-primary-300 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                                    <stat.icon size={24} />
                                </div>
                                {stat.label === 'Pending Action' && statistics.overdue > 0 && (
                                    <span className="px-2 py-1 bg-danger-100 text-danger-700 text-[10px] font-black uppercase rounded-lg">
                                        {statistics.overdue} Overdue
                                    </span>
                                )}
                            </div>
                            <p className="text-2xl font-black text-secondary-900 mb-1">{stat.count}</p>
                            <h4 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">{stat.label}</h4>
                        </div>
                    ))}
                </div>

                {/* Performance Analytics Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="card-premium p-8 bg-white border border-secondary-100 min-h-[400px]">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-xl font-black text-secondary-900">Review Activity</h3>
                                <p className="text-xs font-bold text-secondary-400 uppercase tracking-widest mt-1">Last 6 Months Trend</p>
                            </div>
                            <div className="bg-primary-50 text-primary-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter">
                                Target: 2 / Month
                            </div>
                        </div>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={statistics.activityTrend?.length ? statistics.activityTrend : [{ month: 'Jan', count: 0 }, { month: 'Feb', count: 0 }]}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                    />
                                    <RechartsTooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 800 }}
                                    />
                                    <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="card-premium p-8 bg-white border border-secondary-100 min-h-[400px]">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-xl font-black text-secondary-900">Outcome Distribution</h3>
                                <p className="text-xs font-bold text-secondary-400 uppercase tracking-widest mt-1">Your recommendation profile</p>
                            </div>
                        </div>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statistics.recommendations?.length ? statistics.recommendations : [{ type: 'NO DATA', count: 1 }]}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="count"
                                        nameKey="type"
                                    >
                                        {(statistics.recommendations?.length ? statistics.recommendations : [{ type: 'NO DATA', count: 1 }]).map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={['#10b981', '#f59e0b', '#ef4444', '#6366f1'][index % 4]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 800 }}
                                    />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        iconType="circle"
                                        formatter={(val) => <span className="text-[10px] font-black uppercase text-secondary-600 tracking-widest">{val.replace('_', ' ')}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Recent Assignments (Large Col) */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex justify-between items-center px-2">
                            <h3 className="text-lg font-black text-secondary-900 flex items-center gap-2">
                                <History size={20} className="text-primary-500" /> Recent Assignments
                            </h3>
                        </div>

                        <div className="bg-white rounded-[2.5rem] border border-secondary-200 overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-secondary-50 text-secondary-900 font-bold border-b border-secondary-200">
                                        <tr>
                                            <th className="p-5">Manuscript</th>
                                            <th className="p-5">Journal</th>
                                            <th className="p-5">Status</th>
                                            <th className="p-5"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-secondary-100">
                                        {recentAssignments.map((assignment: any) => (
                                            <tr key={assignment.id} className="hover:bg-secondary-50 transition-colors group">
                                                <td className="p-5">
                                                    <div className="max-w-md">
                                                        <div className="font-bold text-secondary-900 truncate" title={assignment.article.title}>
                                                            {assignment.article.title}
                                                        </div>
                                                        <div className="text-[10px] text-secondary-400 font-bold uppercase mt-1">
                                                            Round {assignment.round} • Due {new Date(assignment.dueDate).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    <span className="text-xs font-bold text-secondary-600 bg-secondary-100 px-2 py-1 rounded">
                                                        {assignment.reviewer.journal.name}
                                                    </span>
                                                </td>
                                                <td className="p-5">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-colors ${assignment.status === 'VALIDATED' ? 'bg-success-100 text-success-700' :
                                                        assignment.status === 'SUBMITTED' ? 'bg-primary-100 text-primary-700' :
                                                            assignment.status === 'REJECTED' ? 'bg-danger-100 text-danger-700' :
                                                                'bg-warning-100 text-warning-700'
                                                        }`}>
                                                        {assignment.status}
                                                    </span>
                                                </td>
                                                <td className="p-5 text-right">
                                                    <Link
                                                        href={`/dashboard/reviewer/assignments/${assignment.id}`}
                                                        className="inline-flex items-center gap-1 text-primary-600 font-black text-xs hover:gap-2 transition-all p-2 hover:bg-primary-50 rounded-xl"
                                                    >
                                                        {assignment.status === 'VALIDATED' ? 'View Review' : 'Process Review'} <ChevronRight size={14} />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                        {recentAssignments.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="p-12 text-center text-secondary-400">
                                                    No assignments found yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar: Upcoming Deadlines & Actions */}
                    <div className="space-y-6">
                        <div className="card-premium p-6 bg-secondary-900 text-white border-0 shadow-xl overflow-hidden relative">
                            <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary-500/20 rounded-full blur-3xl"></div>
                            <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                                <Calendar size={20} className="text-primary-400" /> Critical Deadlines
                            </h3>
                            <div className="space-y-4">
                                {upcomingDeadlines.length === 0 ? (
                                    <p className="text-secondary-400 text-sm italic">No urgent deadlines approaching.</p>
                                ) : (
                                    upcomingDeadlines.map((ad: any) => (
                                        <div key={ad.id} className="p-4 bg-white/10 rounded-2xl border border-white/10 hover:bg-white/15 transition-colors">
                                            <p className="text-xs font-bold text-white mb-2 truncate">{ad.article.title}</p>
                                            <div className="flex justify-between items-end">
                                                <div className="text-[10px] text-primary-300 font-black uppercase tracking-widest">
                                                    {new Date(ad.dueDate).toLocaleDateString()}
                                                </div>
                                                <Link href={`/dashboard/reviewer/assignments/${ad.id}`} className="p-1.5 bg-primary-500 rounded-lg">
                                                    <ArrowUpRight size={14} />
                                                </Link>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="card-premium p-6 bg-white border border-secondary-100">
                            <h3 className="text-md font-black text-secondary-900 mb-4">Quick Resources</h3>
                            <div className="space-y-2">
                                {[
                                    { label: 'Reviewer Guidelines', icon: FileText },
                                    { label: 'Editorial Policy', icon: ShieldCheck },
                                    { label: 'Conflict of Interest', icon: AlertTriangle }
                                ].map((item, i) => (
                                    <button key={i} className="w-full flex items-center justify-between p-3 px-4 rounded-xl border border-secondary-100 hover:border-primary-300 hover:bg-primary-50 text-secondary-600 transition-all group">
                                        <div className="flex items-center gap-3">
                                            <item.icon size={18} className="text-secondary-400 group-hover:text-primary-600" />
                                            <span className="text-xs font-bold">{item.label}</span>
                                        </div>
                                        <ChevronRight size={14} className="text-secondary-300" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

