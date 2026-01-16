'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    Building2, Globe, MapPin, Mail, Phone, MoreVertical,
    Activity, DollarSign, Briefcase, AlertCircle, Server,
    Shield, Smile, Frown, Meh, MessageSquare, TrendingUp,
    Zap
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
    BarChart, Bar
} from 'recharts';

interface CompanyDetails {
    id: string;
    name: string;
    domain: string;
    location: string;
    email: string;
    phone: string;
    status: string;
    logoUrl: string | null;
    stats: {
        totalRevenue: number;
        activeProjects: number;
        openTickets: number;
        healthScore: number;
    };
    recentActivity: any[];
    sentiment: {
        score: number;
        trend: 'UP' | 'DOWN' | 'STABLE';
        breakdown: { positive: number; neutral: number; negative: number };
        keywords: string[];
    };
}

export default function CompanyDetailsPage() {
    const params = useParams();
    const id = params?.id as string;
    const [company, setCompany] = useState<CompanyDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'tickets' | 'financials' | 'intelligence'>('overview');

    useEffect(() => {
        // Simulating data fetch with enhanced Sentiment Data
        setTimeout(() => {
            setCompany({
                id: id,
                name: 'Acme Corp Solutions',
                domain: 'acme.com',
                location: 'New York, USA',
                email: 'contact@acme.com',
                phone: '+1 (555) 123-4567',
                status: 'ACTIVE',
                logoUrl: null,
                stats: {
                    totalRevenue: 1250000,
                    activeProjects: 3,
                    openTickets: 5,
                    healthScore: 88 // Dynamic score
                },
                recentActivity: [
                    { id: 1, title: 'Project "Cloud Migration" started', date: '2 days ago', type: 'project' },
                    { id: 2, title: 'Invoice #INV-2024-001 paid', date: '5 days ago', type: 'finance' },
                    { id: 3, title: 'Critical Ticket #IT-992 resolved', date: '1 week ago', type: 'ticket' }
                ],
                sentiment: {
                    score: 78, // out of 100
                    trend: 'UP',
                    breakdown: { positive: 65, neutral: 25, negative: 10 },
                    keywords: ['Efficient', 'Expensive', 'Quick Support', 'Reliable']
                }
            });
            setLoading(false);
        }, 1200);
    }, [id]);

    const mockChartData = [
        { month: 'Jan', revenue: 45000 },
        { month: 'Feb', revenue: 52000 },
        { month: 'Mar', revenue: 48000 },
        { month: 'Apr', revenue: 61000 },
        { month: 'May', revenue: 55000 },
        { month: 'Jun', revenue: 67000 },
    ];

    const SENTIMENT_COLORS = ['#10b981', '#f59e0b', '#ef4444']; // Green, Amber, Red

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            </DashboardLayout>
        );
    }

    if (!company) return null;

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
                {/* Header Profile Card */}
                <div className="bg-white dark:bg-gray-800 rounded-[2rem] p-8 shadow-xl shadow-indigo-100 dark:shadow-none border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-purple-100 to-indigo-50 rounded-full -mr-16 -mt-16 opacity-50 blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
                    <div className="relative flex flex-col md:flex-row gap-8 items-start md:items-center">
                        <div className="h-28 w-28 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-4xl font-black shadow-2xl transform group-hover:rotate-3 transition-transform duration-500">
                            {company.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">{company.name}</h1>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${company.status === 'ACTIVE' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600'}`}>
                                    {company.status}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-6 mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                                <div className="flex items-center gap-2 hover:text-indigo-600 transition-colors cursor-pointer">
                                    <Globe className="h-4 w-4" /> {company.domain}
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" /> {company.location}
                                </div>
                                <div className="flex items-center gap-2 hover:text-indigo-600 transition-colors cursor-pointer">
                                    <Mail className="h-4 w-4" /> {company.email}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-black transition-all shadow-lg hover:-translate-y-1">
                                Edit Profile
                            </button>
                            <button className="p-3 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <MoreVertical className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-green-50 rounded-2xl text-green-600 group-hover:scale-110 transition-transform">
                                <DollarSign size={24} />
                            </div>
                            <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full">+12%</span>
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Revenue</p>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">₹{(company.stats.totalRevenue / 1000).toFixed(1)}k</h3>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform">
                                <Briefcase size={24} />
                            </div>
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Projects</p>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{company.stats.activeProjects}</h3>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-amber-50 rounded-2xl text-amber-600 group-hover:scale-110 transition-transform">
                                <AlertCircle size={24} />
                            </div>
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Open Tickets</p>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{company.stats.openTickets}</h3>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-[2rem] shadow-lg shadow-indigo-200 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Activity size={64} />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-4 opacity-90">
                                <Shield size={20} />
                                <span className="text-xs font-bold uppercase tracking-widest">Health Score</span>
                            </div>
                            <h3 className="text-4xl font-black">{company.stats.healthScore}/100</h3>
                            <p className="text-xs mt-2 text-indigo-100 font-medium">Top 5% of client base</p>
                        </div>
                    </div>
                </div>

                {/* Main Content Tabs */}
                <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 min-h-[600px] overflow-hidden">
                    <div className="border-b border-gray-100 dark:border-gray-700 px-8 bg-gray-50/30">
                        <div className="flex gap-8 overflow-x-auto">
                            {['overview', 'projects', 'tickets', 'financials', 'intelligence'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`py-6 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === tab
                                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                            : 'border-transparent text-gray-400 hover:text-gray-600 dark:text-gray-500'
                                        }`}
                                >
                                    {tab === 'intelligence' ? (
                                        <span className="flex items-center gap-2"><SparklesIcon /> Intelligence</span>
                                    ) : tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-8">
                        {activeTab === 'overview' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="lg:col-span-2 space-y-8">
                                    <div>
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-lg font-black text-gray-900 dark:text-white">Revenue Trend</h3>
                                            <select className="bg-gray-50 border-none rounded-lg text-xs font-bold px-3 py-1 outline-none">
                                                <option>Last 6 Months</option>
                                                <option>Last Year</option>
                                            </select>
                                        </div>
                                        <div className="h-80 w-full bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={mockChartData}>
                                                    <defs>
                                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 600 }} dy={10} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                                    <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-8">
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6">Recent Activity</h3>
                                        <div className="space-y-4">
                                            {company.recentActivity.map((activity, i) => (
                                                <div key={activity.id} className="flex items-start gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
                                                    <div className={`mt-1 p-2 rounded-xl shrink-0 ${activity.type === 'project' ? 'bg-blue-50 text-blue-600' :
                                                            activity.type === 'finance' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                                                        }`}>
                                                        {activity.type === 'project' && <Briefcase size={16} />}
                                                        {activity.type === 'finance' && <DollarSign size={16} />}
                                                        {activity.type === 'ticket' && <AlertCircle size={16} />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{activity.title}</p>
                                                        <p className="text-xs text-gray-500 font-medium mt-1">{activity.date}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-6 bg-gray-50 dark:bg-gray-700/30 rounded-[2rem] border border-gray-100">
                                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Account Manager</h3>
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 bg-gradient-to-tr from-gray-200 to-gray-300 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                                <span className="text-gray-600 font-bold">JD</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">John Doe</p>
                                                <p className="text-xs text-gray-500 font-medium">Senior Account Executive</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'intelligence' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    {/* Sentiment Score Card */}
                                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-[2.5rem] p-8 border border-emerald-100 relative overflow-hidden">
                                        <div className="relative z-10">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="font-bold text-emerald-800">Client Sentiment Score</h3>
                                                <Smile className="text-emerald-500" />
                                            </div>
                                            <p className="text-5xl font-black text-emerald-600 mb-2">{company.sentiment.score}<span className="text-2xl text-emerald-400">/100</span></p>
                                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                                                <TrendingUp size={14} />
                                                <span>Trending {company.sentiment.trend} vs last month</span>
                                            </div>
                                        </div>
                                        {/* Background Decoration */}
                                        <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-emerald-200 rounded-full opacity-20 blur-2xl"></div>
                                    </div>

                                    {/* Chart */}
                                    <div className="md:col-span-2 bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm">
                                        <h3 className="font-bold text-gray-900 mb-4 ml-2">Communication Tone Analysis</h3>
                                        <div className="h-48 flex items-center gap-8">
                                            <div className="h-full w-48 shrink-0">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={[
                                                                { name: 'Positive', value: company.sentiment.breakdown.positive },
                                                                { name: 'Neutral', value: company.sentiment.breakdown.neutral },
                                                                { name: 'Negative', value: company.sentiment.breakdown.negative },
                                                            ]}
                                                            innerRadius={40}
                                                            outerRadius={60}
                                                            paddingAngle={5}
                                                            dataKey="value"
                                                        >
                                                            {mockChartData.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[index % SENTIMENT_COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="flex-1 space-y-3">
                                                <div>
                                                    <div className="flex justify-between text-sm font-bold mb-1">
                                                        <span className="text-gray-500">Positive Interactions</span>
                                                        <span className="text-gray-900">{company.sentiment.breakdown.positive}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${company.sentiment.breakdown.positive}%` }}></div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex justify-between text-sm font-bold mb-1">
                                                        <span className="text-gray-500">Neutral Interactions</span>
                                                        <span className="text-gray-900">{company.sentiment.breakdown.neutral}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                                        <div className="bg-amber-400 h-2 rounded-full" style={{ width: `${company.sentiment.breakdown.neutral}%` }}></div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex justify-between text-sm font-bold mb-1">
                                                        <span className="text-gray-500">Negative Interactions</span>
                                                        <span className="text-gray-900">{company.sentiment.breakdown.negative}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                                        <div className="bg-red-500 h-2 rounded-full" style={{ width: `${company.sentiment.breakdown.negative}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
                                        <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                                            <MessageSquare size={20} className="text-indigo-500" />
                                            Top Detected Keywords
                                        </h3>
                                        <div className="flex flex-wrap gap-3">
                                            {company.sentiment.keywords.map((kw, i) => (
                                                <span key={i} className={`px-4 py-2 rounded-xl text-sm font-bold ${['Expensive', 'Slow', 'Bug'].some(bad => kw.includes(bad))
                                                        ? 'bg-red-50 text-red-600 border border-red-100'
                                                        : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                                    }`}>
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                        <p className="mt-6 text-xs text-gray-400 font-medium">
                                            *Analyzed from last 50 emails and ticket descriptions using NLP.
                                        </p>
                                    </div>
                                    <div className="bg-indigo-900 text-white rounded-[2.5rem] p-8 relative overflow-hidden">
                                        <div className="relative z-10">
                                            <h3 className="font-bold text-xl mb-4">AI Prediction</h3>
                                            <p className="text-indigo-200 leading-relaxed mb-6">
                                                Based on current sentiment and ticket resolution velocity, this client has a <span className="text-white font-black">92% probability of renewal</span> in Q4.
                                            </p>
                                            <div className="flex gap-4">
                                                <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold">
                                                    Churn Risk: Low
                                                </div>
                                                <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold">
                                                    Upsell Opportunity: High
                                                </div>
                                            </div>
                                        </div>
                                        <Zap className="absolute -bottom-6 -right-6 w-48 h-48 text-indigo-800 opacity-50 rotate-12" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'projects' && (
                            <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                <Server className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                <p className="text-gray-400 font-medium">Projects Module - Loading Active Projects...</p>
                            </div>
                        )}

                        {activeTab === 'financials' && (
                            <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                <p className="text-gray-400 font-medium">Financials Module - Loading Invoices & Statements...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
);
