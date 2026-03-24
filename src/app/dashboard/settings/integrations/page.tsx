'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Settings, Cpu, Webhook, KeyRound, Loader2, Save, CheckCircle, AlertTriangle, PlugZap } from 'lucide-react';
import toast from 'react-hot-toast';

// List of supported integrations hardcoded for UI context
const SUPPORTED_PROVIDERS = [
    { id: 'GEMINI', name: 'Google Gemini AI', icon: Cpu, desc: 'Used for intelligent Document OCR and chat.', type: 'AI' },
    { id: 'PLAGIARISM_SCANNER', name: 'Turnitin / iThenticate', icon: Webhook, desc: 'Used for scanning Journal Articles.', type: 'Webhook' },
    { id: 'AWS_SES', name: 'Amazon SES', icon: KeyRound, desc: 'Used for batch Marketing Campaigns.', type: 'SMTP' },
    { id: 'WHATSAPP_TWILIO', name: 'WhatsApp via Twilio', icon: Webhook, desc: 'Used for operational and HR WhatsApp notifications.', type: 'Messaging' }
];

export default function IntegrationsGatewayPage() {
    const [integrations, setIntegrations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [testing, setTesting] = useState<string | null>(null);

    const [formStates, setFormStates] = useState<Record<string, { key: string, value: string, isActive: boolean, isSet: boolean }>>({});

    const fetchIntegrations = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/settings/integrations');
            if (res.ok) {
                const data = await res.json();
                setIntegrations(data);
                
                // Prefill form states with active states
                const states: Record<string, any> = {};
                data.forEach((i: any) => {
                    states[i.provider] = { key: '', value: i.value || '', isActive: i.isActive, isSet: i.isSet };
                });
                
                // Initialize empty states for ones not pulled yet
                SUPPORTED_PROVIDERS.forEach(p => {
                    if (!states[p.id]) states[p.id] = { key: '', value: '', isActive: false, isSet: false };
                });
                
                setFormStates(states);
            } else {
                toast.error('Failed to load integrations');
            }
        } catch (err) {
            console.error('Fetch error:', err);
            toast.error('Network error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchIntegrations();
    }, [fetchIntegrations]);

    const handleSave = async (provider: string) => {
        const state = formStates[provider];
        if (!state.isSet && !state.key) {
            return toast.error("Please provide a new API Key to activate this integration.");
        }

        setSaving(provider);
        try {
            const res = await fetch('/api/settings/integrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider,
                    key: state.key || undefined, // only send if provided
                    value: state.value || '',
                    isActive: true
                })
            });

            if (res.ok) {
                toast.success(`${provider} API Key secured and locked.`);
                fetchIntegrations(); // Refresh to hide the new key from memory
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to save integration');
            }
        } catch (err) {
            console.error(err);
            toast.error('Network error. Try again.');
        } finally {
            setSaving(null);
        }
    };

    const handleTest = async (provider: string) => {
        setTesting(provider);
        try {
            const res = await fetch('/api/settings/integrations/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(data.message || `${provider} connection verified.`);
            } else {
                toast.error(data.error || data.message || `Failed to verify ${provider}.`);
            }
        } catch (error) {
            console.error(error);
            toast.error('Network error while testing integration.');
        } finally {
            setTesting(null);
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-8">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900 tracking-tight flex items-center gap-3">
                            <Settings className="text-primary-600" size={32} />
                            Integration Gateway
                        </h1>
                        <p className="text-secondary-500 font-medium mt-1">
                            Securely map and store API Keys for external AI, Plagiarism, and Marketing providers.
                        </p>
                    </div>
                </div>

                {/* Gateway Warning */}
               <div className="bg-primary-50/50 backdrop-blur-xl rounded-[2rem] p-6 shadow-xl shadow-primary-500/10 border border-primary-100 flex items-start gap-4">
                    <div className="p-3 bg-primary-100/50 rounded-2xl text-primary-600 shadow-sm border border-primary-100">
                        <KeyRound size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-secondary-900 tracking-tight flex items-center gap-2">
                        API Security Protocol Active
                        </h3>
                        <p className="text-sm font-medium text-secondary-600 mt-1 leading-relaxed max-w-2xl">
                            Saved configuration keys are <span className="text-secondary-900 font-bold bg-secondary-100 px-1.5 py-0.5 rounded">never transmitted</span> back to the client interface for viewing. If a key is marked as saved but not functioning, simply overwrite it with a new key and update.
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20 text-secondary-400">
                        <Loader2 className="animate-spin mb-4 text-primary-500" size={40} />
                        <p className="font-bold">Syncing Security Credentials...</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {SUPPORTED_PROVIDERS.map((provider) => {
                            const state = formStates[provider.id] || { key: '', value: '', isActive: false, isSet: false };
                            const Icon = provider.icon;

                            return (
                                <div key={provider.id} className="bg-white rounded-[2rem] p-6 shadow-xl shadow-secondary-200/50 border border-secondary-100 transition-all flex flex-col md:flex-row gap-8 items-start relative overflow-hidden group">
                                    {/* Sidebar Identity */}
                                    <div className="md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-secondary-100 pb-6 md:pb-0 md:pr-6">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`p-3 rounded-2xl border ${state.isSet ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-secondary-50 text-secondary-400 border-secondary-100'}`}>
                                                <Icon size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-secondary-900">{provider.name}</h3>
                                                <span className="text-[10px] uppercase tracking-widest font-black text-secondary-400 bg-secondary-50 px-2 py-0.5 rounded-lg border border-secondary-100">
                                                    {provider.type}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-xs font-medium text-secondary-500 leading-relaxed mb-4">
                                            {provider.desc}
                                        </p>
                                        
                                        {state.isSet ? (
                                             <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
                                                <CheckCircle size={14} /> Active & Secured
                                             </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-xs font-bold text-warning-700 bg-warning-50 px-3 py-2 rounded-xl border border-warning-100">
                                                <AlertTriangle size={14} /> Unconfigured
                                             </div>
                                        )}
                                    </div>

                                    {/* Edit Portal */}
                                    <div className="flex-1 w-full space-y-4 pt-1">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black tracking-widest text-secondary-400 uppercase">Provider API Key (Hidden on Save)</label>
                                            <div className="flex relative">
                                                <input 
                                                    type="password" 
                                                    placeholder={state.isSet ? '••••••••••••••••••••••••• (Stored Securely)' : 'Enter Private Key / Secret Token...'}
                                                    className="w-full pl-4 pr-4 py-3 bg-secondary-50 rounded-2xl border-none focus:ring-2 focus:ring-primary-500 outline-none transition-all font-mono text-sm text-secondary-900 tracking-wider shadow-inner"
                                                    value={state.key}
                                                    onChange={e => setFormStates({...formStates, [provider.id]: { ...state, key: e.target.value }})}
                                                />
                                            </div>
                                        </div>

                                        {(provider.id === 'AWS_SES' || provider.id === 'WHATSAPP_TWILIO') && (
                                            <div className="space-y-2 mt-4">
                                                <label className="text-[10px] font-black tracking-widest text-secondary-400 uppercase">
                                                    {provider.id === 'AWS_SES' ? 'Sender Identity (Email Endpoint)' : 'Provider Config JSON'}
                                                </label>
                                                <input 
                                                    type="text" 
                                                    placeholder={provider.id === 'AWS_SES'
                                                        ? 'noreply@stm.com'
                                                        : '{"accountSid":"AC...","from":"whatsapp:+14155238886"}'}
                                                    className="input-premium w-full text-sm font-medium"
                                                    value={state.value}
                                                    onChange={e => setFormStates({...formStates, [provider.id]: { ...state, value: e.target.value }})}
                                                />
                                                {provider.id === 'WHATSAPP_TWILIO' && (
                                                    <p className="text-xs font-medium text-secondary-500">
                                                        Save the Twilio auth token in the secret field above. Use JSON here for `accountSid` and `from`.
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex justify-end gap-3 pt-2">
                                            {['GEMINI', 'PLAGIARISM_SCANNER', 'AWS_SES', 'WHATSAPP_TWILIO'].includes(provider.id) && (
                                                <button
                                                    onClick={() => handleTest(provider.id)}
                                                    disabled={testing === provider.id}
                                                    className="px-5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all border border-secondary-200 text-secondary-700 hover:bg-secondary-50"
                                                >
                                                    {testing === provider.id ? (
                                                        <><Loader2 size={16} className="animate-spin" /> Testing...</>
                                                    ) : (
                                                        <><PlugZap size={16} /> Test Connection</>
                                                    )}
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => handleSave(provider.id)}
                                                disabled={saving === provider.id || (!state.key && !state.isSet)}
                                                className={`px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md ${
                                                    (!state.key && !state.isSet) ? 'bg-secondary-100 text-secondary-400 cursor-not-allowed shadow-none' : 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-500/20'
                                                }`}
                                            >
                                                {saving === provider.id ? (
                                                    <><Loader2 size={16} className="animate-spin" /> Storing key...</>
                                                ) : (
                                                    <><Save size={16} /> {state.isSet ? 'Overwrite Token' : 'Save & Encrypt'}</>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
