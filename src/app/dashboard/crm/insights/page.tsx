'use client';

import { useState, useEffect } from 'react';
import CRMClientLayout from '../CRMClientLayout';
import { CRMPageShell } from '@/components/crm/CRMPageShell';
import { 
    BarChart3, 
    Users, 
    Building2, 
    TrendingUp, 
    ShieldAlert, 
    Loader2, 
    Sparkles, 
    Mail, 
    Copy, 
    Check, 
    AlertTriangle,
    CheckCircle2,
    HeartPulse
} from 'lucide-react';
import toast from 'react-hot-toast';

interface CustomerHealth {
    id: string;
    name: string;
    organizationName: string;
    email: string;
    phone: string | null;
    healthScore: number;
    churnRisk: boolean;
    activeSubscriptions: number;
    unpaidInvoices: number;
    reasons: string[];
}

interface RetentionPlan {
    summary: string;
    strategies: Array<{ title: string; impact: string; action: string }>;
    emailSubject: string;
    emailBody: string;
}

export default function CRMInsightsPage() {
    const [stats, setStats] = useState({
        customers: 0,
        institutions: 0,
        agencies: 0,
        subscriptions: 0,
        loading: true
    });

    const [healthData, setHealthData] = useState<CustomerHealth[]>([]);
    const [loadingHealth, setLoadingHealth] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerHealth | null>(null);
    const [retentionPlan, setRetentionPlan] = useState<RetentionPlan | null>(null);
    const [generatingPlan, setGeneratingPlan] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        // Fetch simple aggregated stats for Insights page overviews
        Promise.all([
            fetch('/api/customers?limit=1&type=INDIVIDUAL').then(r => r.json()),
            fetch('/api/customers?limit=1&type=INSTITUTION').then(r => r.json()),
            fetch('/api/customers?limit=1&type=AGENCY').then(r => r.json()),
            fetch('/api/subscriptions?limit=1&status=ACTIVE').then(r => r.json()),
        ]).then(([inds, insts, ags, subs]) => {
            setStats({
                customers: inds.pagination?.total || 0,
                institutions: insts.pagination?.total || 0,
                agencies: ags.pagination?.total || 0,
                subscriptions: subs.pagination?.total || 0,
                loading: false
            });
        }).catch(() => {
            setStats(s => ({ ...s, loading: false }));
        });

        // Fetch customer health metrics
        fetch('/api/crm/health')
            .then(res => res.json())
            .then(data => {
                if (data.customers) {
                    setHealthData(data.customers);
                }
                setLoadingHealth(false);
            })
            .catch(err => {
                console.error(err);
                setLoadingHealth(false);
            });
    }, []);

    const handleGeneratePlan = async (customer: CustomerHealth) => {
        setSelectedCustomer(customer);
        setRetentionPlan(null);
        setGeneratingPlan(true);

        try {
            const res = await fetch('/api/crm/generate-retention', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    customerId: customer.id,
                    customerName: customer.name,
                    healthScore: customer.healthScore,
                    reasons: customer.reasons
                })
            });

            if (res.ok) {
                const plan = await res.json();
                setRetentionPlan(plan);
                toast.success(`Generated retention plan for ${customer.name}`);
            } else {
                toast.error('Failed to generate retention strategy plan.');
            }
        } catch (err) {
            console.error(err);
            toast.error('Error generating AI retention strategy.');
        } finally {
            setGeneratingPlan(false);
        }
    };

    const handleCopyEmail = () => {
        if (!retentionPlan) return;
        navigator.clipboard.writeText(`Subject: ${retentionPlan.emailSubject}\n\n${retentionPlan.emailBody}`);
        setCopied(true);
        toast.success('Email outreach copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <CRMClientLayout>
            <CRMPageShell
                title="CRM Insights"
                subtitle="High-level metrics, customer health indexing, and AI retention generation."
                icon={<BarChart3 className="w-5 h-5" />}
                breadcrumb={[{ label: 'CRM', href: '/dashboard/crm' }, { label: 'Insights' }]}
            >
                {/* Stats Summary Widgets */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-3xl p-6 border border-secondary-100 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 text-primary-100 transform group-hover:scale-125 transition-transform opacity-30">
                            <Users size={64} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-secondary-400 mb-1">Individuals</p>
                        <p className="text-4xl font-black text-secondary-900">{stats.loading ? '--' : stats.customers}</p>
                        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-success-600">
                            <TrendingUp size={12} /> Active contacts
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-3xl p-6 border border-secondary-100 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 text-emerald-100 transform group-hover:scale-125 transition-transform opacity-30">
                            <Building2 size={64} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-secondary-400 mb-1">Institutions</p>
                        <p className="text-4xl font-black text-secondary-900">{stats.loading ? '--' : stats.institutions}</p>
                        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-600">
                            <TrendingUp size={12} /> Registered organizations
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-secondary-100 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 text-amber-100 transform group-hover:scale-125 transition-transform opacity-30">
                            <BarChart3 size={64} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-secondary-400 mb-1">Agencies</p>
                        <p className="text-4xl font-black text-secondary-900">{stats.loading ? '--' : stats.agencies}</p>
                        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-amber-600">
                            <TrendingUp size={12} /> Channel partners
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-secondary-100 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 text-indigo-100 transform group-hover:scale-125 transition-transform opacity-30">
                            <TrendingUp size={64} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-secondary-400 mb-1">Active Subscriptions</p>
                        <p className="text-4xl font-black text-secondary-900">{stats.loading ? '--' : stats.subscriptions}</p>
                        <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-indigo-600">
                            <TrendingUp size={12} /> Active contracts
                        </div>
                    </div>
                </div>

                {/* AI Customer Health & Retention Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Health Monitor List */}
                    <div className="card-premium p-6 border border-secondary-100 shadow-xl bg-white flex flex-col h-[600px]">
                        <div className="mb-6 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black text-secondary-900 flex items-center gap-2">
                                    <HeartPulse className="text-primary-600" />
                                    Customer Health Monitor
                                </h3>
                                <p className="text-xs text-secondary-500 font-medium">Dynamically calculated using billing settlement metrics & active contracts.</p>
                            </div>
                            <span className="bg-primary-50 border border-primary-200 text-primary-700 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">
                                AI Powered
                            </span>
                        </div>

                        <div className="overflow-y-auto flex-1 space-y-4 pr-2">
                            {loadingHealth ? (
                                <div className="flex flex-col items-center justify-center h-full py-12 space-y-3">
                                    <Loader2 size={32} className="animate-spin text-primary-600" />
                                    <p className="text-xs text-secondary-500 font-bold italic animate-pulse">Running health audits on customer profiles...</p>
                                </div>
                            ) : healthData.length === 0 ? (
                                <div className="text-center py-12 text-secondary-400 font-bold italic">
                                    No customer profiles available to analyze.
                                </div>
                            ) : (
                                healthData.map(cust => (
                                    <div 
                                        key={cust.id}
                                        className={`p-4 border rounded-2xl transition-all cursor-pointer flex justify-between items-center ${
                                            selectedCustomer?.id === cust.id 
                                                ? 'border-primary-500 bg-primary-50/20 shadow-md'
                                                : cust.churnRisk 
                                                    ? 'border-rose-100 bg-rose-50/10 hover:border-rose-300' 
                                                    : 'border-secondary-100 hover:border-primary-200 hover:bg-secondary-50/30'
                                        }`}
                                        onClick={() => handleGeneratePlan(cust)}
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-black text-secondary-900">{cust.name}</h4>
                                                <span className="text-[9px] font-bold text-secondary-400 uppercase tracking-tighter">
                                                    {cust.organizationName}
                                                </span>
                                            </div>
                                            <div className="flex gap-4 text-[10px] text-secondary-500 font-bold">
                                                <span>Active Subs: {cust.activeSubscriptions}</span>
                                                <span className={cust.unpaidInvoices > 0 ? 'text-rose-600' : ''}>Unpaid Invoices: {cust.unpaidInvoices}</span>
                                            </div>
                                        </div>

                                        <div className="text-right flex items-center gap-4">
                                            <div>
                                                <p className={`text-xl font-black ${
                                                    cust.healthScore >= 80 
                                                        ? 'text-emerald-600' 
                                                        : cust.healthScore >= 60 
                                                            ? 'text-amber-500' 
                                                            : 'text-rose-600'
                                                }`}>{cust.healthScore}%</p>
                                                <p className="text-[8px] text-secondary-400 font-bold uppercase tracking-wider">Health Score</p>
                                            </div>

                                            {cust.churnRisk && (
                                                <span className="bg-rose-100 border border-rose-200 text-rose-700 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase animate-pulse">
                                                    At Churn Risk
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right Column: AI Retention Engine panel */}
                    <div className="card-premium p-6 border border-secondary-100 shadow-xl bg-white flex flex-col h-[600px] overflow-y-auto">
                        {!selectedCustomer ? (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                                <Sparkles size={48} className="text-secondary-300" />
                                <div>
                                    <h4 className="text-base font-black text-secondary-800">Retention Strategy Sandbox</h4>
                                    <p className="text-xs text-secondary-400 font-bold uppercase max-w-[280px] mx-auto leading-relaxed mt-1">
                                        Select a customer from the monitor to automatically design retention plans and write outreach proposals.
                                    </p>
                                </div>
                            </div>
                        ) : generatingPlan ? (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                                <Loader2 size={40} className="animate-spin text-primary-600" />
                                <div>
                                    <h4 className="text-base font-black text-secondary-800 animate-pulse">Drafting AI Action Plans...</h4>
                                    <p className="text-xs text-secondary-500 italic mt-1">Gemini is writing custom solutions for {selectedCustomer.name}</p>
                                </div>
                            </div>
                        ) : retentionPlan ? (
                            <div className="space-y-6">
                                <div className="border-b border-secondary-100 pb-3 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg font-black text-secondary-900 flex items-center gap-1.5">
                                            <Sparkles className="text-amber-500 animate-bounce" size={18} />
                                            AI Action Plan: {selectedCustomer.name}
                                        </h3>
                                        <p className="text-xs text-secondary-400 font-bold uppercase mt-1">Audit score: {selectedCustomer.healthScore}% health</p>
                                    </div>
                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${
                                        selectedCustomer.churnRisk ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                        {selectedCustomer.churnRisk ? 'High Threat' : 'Stable'}
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    {/* Executive Summary */}
                                    <div className="bg-secondary-50 p-4 border border-secondary-100 rounded-2xl">
                                        <h4 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1.5">Analysis Summary</h4>
                                        <p className="text-sm font-bold text-secondary-800 leading-relaxed italic">
                                            "{retentionPlan.summary}"
                                        </p>
                                    </div>

                                    {/* Core Strategies */}
                                    <div>
                                        <h4 className="text-xs font-black text-secondary-400 uppercase tracking-widest mb-3">Key Interventions</h4>
                                        <div className="space-y-3">
                                            {retentionPlan.strategies.map((strat, idx) => (
                                                <div key={idx} className="p-3 bg-white border border-secondary-100 rounded-xl flex gap-3 items-start shadow-sm border-l-4 border-l-primary-500">
                                                    <span className="bg-primary-50 text-primary-700 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                                                        {idx + 1}
                                                    </span>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <h5 className="text-xs font-black text-secondary-900">{strat.title}</h5>
                                                            <span className={`text-[8px] font-black px-1.5 py-0.2 rounded uppercase ${
                                                                strat.impact === 'HIGH' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                                                            }`}>{strat.impact} IMPACT</span>
                                                        </div>
                                                        <p className="text-xs text-secondary-600 font-medium leading-relaxed">
                                                            {strat.action}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Outreach template */}
                                    <div className="border-t border-secondary-100 pt-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="text-xs font-black text-secondary-400 uppercase tracking-widest flex items-center gap-1">
                                                <Mail size={14} /> Email Outreach Proposal
                                            </h4>
                                            <button
                                                onClick={handleCopyEmail}
                                                className="flex items-center gap-1 text-[10px] font-black uppercase text-primary-600 hover:text-primary-800 transition-colors"
                                            >
                                                {copied ? <Check size={10} /> : <Copy size={10} />} Copy Outreach
                                            </button>
                                        </div>
                                        <div className="bg-secondary-900 text-white rounded-2xl p-4 font-mono text-[11px] leading-relaxed relative max-h-56 overflow-y-auto">
                                            <p className="text-primary-300 font-bold border-b border-secondary-800 pb-2 mb-2">
                                                Subject: {retentionPlan.emailSubject}
                                            </p>
                                            <p className="whitespace-pre-wrap">{retentionPlan.emailBody}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                                <AlertTriangle size={32} className="text-rose-500" />
                                <p className="text-xs text-secondary-500 font-bold">Failed to load retention strategies. Click try again.</p>
                            </div>
                        )}
                    </div>
                </div>
            </CRMPageShell>
        </CRMClientLayout>
    );
}

