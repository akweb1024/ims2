'use client';

import { useState, useEffect, useCallback } from 'react';
import { BadgeDollarSign, Loader2, Save, CheckCircle, AlertTriangle, PlugZap } from 'lucide-react';
import toast from 'react-hot-toast';

interface CompanyRazorpaySettingsProps {
    companyId: string;
}

interface RazorpayConfig {
    keyId: string;
    webhookSecret: string;
    accountLabel: string;
}

const EMPTY_CONFIG: RazorpayConfig = { keyId: '', webhookSecret: '', accountLabel: '' };

/**
 * Per-company Razorpay setup — same CompanyIntegration(provider='RAZORPAY') record and
 * Settings > Integrations test/save API already used platform-wide, but targetable at an
 * arbitrary company (via ?companyId=) the way Brands already are, instead of only the
 * logged-in admin's own company. Structured fields instead of a raw JSON textarea.
 */
export default function CompanyRazorpaySettings({ companyId }: CompanyRazorpaySettingsProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [keySecret, setKeySecret] = useState('');
    const [config, setConfig] = useState<RazorpayConfig>(EMPTY_CONFIG);
    const [meta, setMeta] = useState<any>(null);

    const fetchIntegration = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/settings/integrations?companyId=${companyId}`);
            if (res.ok) {
                const data = await res.json();
                const razorpay = data.find((i: any) => i.provider === 'RAZORPAY');
                setMeta(razorpay || null);
                if (razorpay?.value) {
                    try {
                        const parsed = JSON.parse(razorpay.value);
                        setConfig({ keyId: parsed.keyId || '', webhookSecret: parsed.webhookSecret || '', accountLabel: parsed.accountLabel || '' });
                    } catch {
                        // legacy/malformed value — leave fields blank rather than guessing
                    }
                } else {
                    setConfig(EMPTY_CONFIG);
                }
            } else {
                toast.error('Failed to load Razorpay settings');
            }
        } catch {
            toast.error('Network error loading Razorpay settings');
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => { fetchIntegration(); }, [fetchIntegration]);

    const isSet = !!meta?.isSet;

    const handleSave = async () => {
        if (!isSet && !keySecret) {
            toast.error("Enter the Razorpay Key Secret to activate this company's account.");
            return;
        }
        if (!config.keyId.trim()) {
            toast.error('Key ID is required.');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch('/api/settings/integrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    companyId,
                    provider: 'RAZORPAY',
                    key: keySecret || undefined,
                    value: JSON.stringify(config),
                    isActive: true,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success('Razorpay settings saved for this company.');
                setKeySecret('');
                fetchIntegration();
            } else {
                toast.error(data.error || 'Failed to save Razorpay settings');
            }
        } catch {
            toast.error('Network error while saving');
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        try {
            const res = await fetch('/api/settings/integrations/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: 'RAZORPAY', companyId }),
            });
            const data = await res.json();
            if (res.ok) toast.success(data.message || 'Razorpay connection verified.');
            else toast.error(data.error || data.message || 'Razorpay test failed.');
        } catch {
            toast.error('Network error while testing connection');
        } finally {
            setTesting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-16 text-secondary-400">
                <Loader2 className="animate-spin mb-3 text-primary-500" size={32} />
                <p className="font-bold text-sm">Loading Razorpay settings…</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-secondary-200/50 border border-secondary-100 flex flex-col md:flex-row gap-8 items-start">
            {/* Sidebar identity */}
            <div className="md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-secondary-100 pb-6 md:pb-0 md:pr-6">
                <div className="flex items-center gap-3 mb-3">
                    <div className={`p-3 rounded-2xl border ${isSet ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-secondary-50 text-secondary-400 border-secondary-100'}`}>
                        <BadgeDollarSign size={24} />
                    </div>
                    <div>
                        <h3 className="font-black text-secondary-900">Razorpay Payments</h3>
                        <span className="text-[10px] uppercase tracking-widest font-black text-secondary-400 bg-secondary-50 px-2 py-0.5 rounded-lg border border-secondary-100">
                            Payments
                        </span>
                    </div>
                </div>
                <p className="text-xs font-medium text-secondary-500 leading-relaxed mb-4">
                    This company&apos;s own Razorpay account. Order creation and payment verification already use it automatically; setting a webhook secret here also attributes real-time webhook payments to this company instead of the shared default.
                </p>
                {isSet ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
                        <CheckCircle size={14} /> Active &amp; Secured
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-xs font-bold text-warning-700 bg-warning-50 px-3 py-2 rounded-xl border border-warning-100">
                        <AlertTriangle size={14} /> Using platform default
                    </div>
                )}
            </div>

            {/* Edit portal */}
            <div className="flex-1 w-full space-y-4 pt-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black tracking-widest text-secondary-400 uppercase">Key ID</label>
                        <input
                            type="text"
                            placeholder="rzp_live_xxxxxxxxxxxx"
                            className="input-premium w-full text-sm font-medium font-mono"
                            value={config.keyId}
                            onChange={(e) => setConfig({ ...config, keyId: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black tracking-widest text-secondary-400 uppercase">Account Label (optional)</label>
                        <input
                            type="text"
                            placeholder="e.g. Main Account"
                            className="input-premium w-full text-sm font-medium"
                            value={config.accountLabel}
                            onChange={(e) => setConfig({ ...config, accountLabel: e.target.value })}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black tracking-widest text-secondary-400 uppercase">
                        Key Secret {isSet && '(Hidden on Save)'}
                    </label>
                    <input
                        type="password"
                        placeholder={isSet ? '••••••••••••••••••••••••• (Stored Securely)' : 'Enter Key Secret...'}
                        className="w-full pl-4 pr-4 py-3 bg-secondary-50 rounded-2xl border-none focus:ring-2 focus:ring-primary-500 outline-none transition-all font-mono text-sm text-secondary-900 tracking-wider shadow-inner"
                        value={keySecret}
                        onChange={(e) => setKeySecret(e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black tracking-widest text-secondary-400 uppercase">Webhook Secret (optional)</label>
                    <input
                        type="password"
                        placeholder="Only needed if this company has its own Razorpay webhook"
                        className="input-premium w-full text-sm font-medium font-mono"
                        value={config.webhookSecret}
                        onChange={(e) => setConfig({ ...config, webhookSecret: e.target.value })}
                    />
                    <p className="text-xs font-medium text-secondary-500">
                        Leave blank to verify this company&apos;s webhooks with the platform-wide secret.
                    </p>
                </div>

                {meta && (
                    <div className="rounded-2xl border border-secondary-100 bg-secondary-50/70 px-4 py-3 text-xs text-secondary-600 space-y-1">
                        <div>
                            <span className="font-black uppercase tracking-widest text-[10px] text-secondary-400">Last Test</span>
                            <div className="mt-1 font-medium text-secondary-800">
                                {meta.lastTestedAt ? new Date(meta.lastTestedAt).toLocaleString() : 'Never tested'}
                            </div>
                        </div>
                        {meta.lastTestStatus && (
                            <div>
                                <span className="font-black uppercase tracking-widest text-[10px] text-secondary-400">Latest Result</span>
                                <div className={`mt-1 inline-flex rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-widest ${meta.lastTestStatus === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-danger-100 text-danger-700'}`}>
                                    {meta.lastTestStatus}
                                </div>
                                {meta.lastTestMessage && (
                                    <p className="mt-2 text-secondary-600 leading-relaxed">{meta.lastTestMessage}</p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        onClick={handleTest}
                        disabled={testing || !isSet}
                        title={!isSet ? 'Save credentials before testing' : undefined}
                        className="px-5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all border border-secondary-200 text-secondary-700 hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {testing ? <><Loader2 size={16} className="animate-spin" /> Testing...</> : <><PlugZap size={16} /> Test Connection</>}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || (!keySecret && !isSet)}
                        className={`px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md ${(!keySecret && !isSet) ? 'bg-secondary-100 text-secondary-400 cursor-not-allowed shadow-none' : 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-500/20'}`}
                    >
                        {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> {isSet ? 'Update Settings' : 'Save & Activate'}</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
