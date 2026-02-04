'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Settings, Key, Cloud, MessageSquare, CreditCard, Mail, Database, Lock, Eye, EyeOff, Plus, Trash2, Save, X } from 'lucide-react';

interface Configuration {
    id: string;
    category: string;
    key: string;
    value: string;
    maskedValue: string;
    description?: string;
    isActive: boolean;
    createdAt: string;
}

const CATEGORIES = [
    { value: 'AWS', label: 'AWS Services', icon: Cloud, color: 'orange' },
    { value: 'WHATSAPP', label: 'WhatsApp Business', icon: MessageSquare, color: 'green' },
    { value: 'AI_MODELS', label: 'AI Models', icon: Database, color: 'purple' },
    { value: 'PAYMENT_GATEWAY', label: 'Payment Gateway', icon: CreditCard, color: 'blue' },
    { value: 'EMAIL_SERVICE', label: 'Email Service', icon: Mail, color: 'red' },
    { value: 'SMS_SERVICE', label: 'SMS Service', icon: MessageSquare, color: 'cyan' },
    { value: 'CLOUD_STORAGE', label: 'Cloud Storage', icon: Cloud, color: 'indigo' },
    { value: 'ANALYTICS', label: 'Analytics', icon: Database, color: 'pink' },
    { value: 'SOCIAL_MEDIA', label: 'Social Media', icon: MessageSquare, color: 'blue' },
    { value: 'OTHER', label: 'Other', icon: Settings, color: 'gray' }
];

const PREDEFINED_KEYS: Record<string, string[]> = {
    AWS: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_S3_BUCKET'],
    WHATSAPP: ['WHATSAPP_BUSINESS_ID', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_VERIFY_TOKEN'],
    AI_MODELS: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_AI_API_KEY', 'HUGGINGFACE_API_KEY'],
    PAYMENT_GATEWAY: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'STRIPE_PUBLIC_KEY', 'STRIPE_SECRET_KEY'],
    EMAIL_SERVICE: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SENDGRID_API_KEY'],
    SMS_SERVICE: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'],
    CLOUD_STORAGE: ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'],
    ANALYTICS: ['GOOGLE_ANALYTICS_ID', 'MIXPANEL_TOKEN', 'SEGMENT_WRITE_KEY'],
    SOCIAL_MEDIA: ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET', 'TWITTER_API_KEY', 'TWITTER_API_SECRET'],
    OTHER: []
};

export default function ConfigurationsPage() {
    const [user, setUser] = useState<any>(null);
    const [configurations, setConfigurations] = useState<Configuration[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('AWS');
    const [showValues, setShowValues] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newConfig, setNewConfig] = useState({
        category: 'AWS',
        key: '',
        value: '',
        description: ''
    });
    const [isCustomKey, setIsCustomKey] = useState(false);
    const [customKey, setCustomKey] = useState('');

    const fetchConfigurations = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const url = `/api/settings/configurations?category=${selectedCategory}&showValues=${showValues}`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setConfigurations(data);
            }
        } catch (error) {
            console.error('Fetch configurations error:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedCategory, showValues]);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        }
        fetchConfigurations();
    }, [fetchConfigurations]);

    const handleSaveConfig = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/settings/configurations', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newConfig)
            });

            if (res.ok) {
                setShowAddModal(false);
                setNewConfig({ category: selectedCategory, key: '', value: '', description: '' });
                setIsCustomKey(false);
                setCustomKey('');
                fetchConfigurations();
            } else {
                const error = await res.json();
                alert(error.error || 'Failed to save configuration');
            }
        } catch (error) {
            console.error('Save configuration error:', error);
            alert('Failed to save configuration');
        }
    };

    const handleDeleteConfig = async (id: string) => {
        if (!confirm('Are you sure you want to delete this configuration?')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/settings/configurations?id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                fetchConfigurations();
            } else {
                alert('Failed to delete configuration');
            }
        } catch (error) {
            console.error('Delete configuration error:', error);
            alert('Failed to delete configuration');
        }
    };

    const filteredConfigs = configurations.filter(c => c.category === selectedCategory);
    const CategoryIcon = CATEGORIES.find(c => c.value === selectedCategory)?.icon || Settings;

    return (
        <DashboardLayout userRole={user?.role}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900 flex items-center gap-3">
                            <div className="p-3 bg-primary-100 rounded-2xl">
                                <Settings className="w-8 h-8 text-primary-600" />
                            </div>
                            Application Settings
                        </h1>
                        <p className="text-secondary-500 mt-2">Manage API keys, credentials, and integrations</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Add Configuration
                    </button>
                </div>

                {/* Category Tabs */}
                <div className="card-premium p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Lock className="w-5 h-5 text-secondary-500" />
                        <h2 className="font-bold text-lg text-secondary-900">Configuration Categories</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {CATEGORIES.map((cat) => {
                            const Icon = cat.icon;
                            const isActive = selectedCategory === cat.value;
                            return (
                                <button
                                    key={cat.value}
                                    onClick={() => setSelectedCategory(cat.value)}
                                    className={`p-4 rounded-xl border-2 transition-all ${isActive
                                        ? 'border-primary-500 bg-primary-50 shadow-lg'
                                        : 'border-secondary-200 bg-white hover:border-primary-300'
                                        }`}
                                >
                                    <Icon className={`w-6 h-6 mx-auto mb-2 ${isActive ? 'text-primary-600' : 'text-secondary-400'}`} />
                                    <p className={`text-sm font-bold ${isActive ? 'text-primary-700' : 'text-secondary-600'}`}>
                                        {cat.label}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Configurations List */}
                <div className="card-premium p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <CategoryIcon className="w-6 h-6 text-primary-600" />
                            <h2 className="font-bold text-xl text-secondary-900">
                                {CATEGORIES.find(c => c.value === selectedCategory)?.label} Configurations
                            </h2>
                        </div>
                        <button
                            onClick={() => setShowValues(!showValues)}
                            className="btn btn-secondary flex items-center gap-2"
                        >
                            {showValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            {showValues ? 'Hide' : 'Show'} Values
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                        </div>
                    ) : filteredConfigs.length === 0 ? (
                        <div className="text-center py-12">
                            <Key className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
                            <p className="text-secondary-500">No configurations found for this category</p>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="btn btn-primary mt-4"
                            >
                                Add First Configuration
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredConfigs.map((config) => (
                                <div
                                    key={config.id}
                                    className="p-4 border border-secondary-200 rounded-xl hover:border-primary-300 transition-all bg-white"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Key className="w-5 h-5 text-primary-600" />
                                                <h3 className="font-bold text-secondary-900">{config.key}</h3>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${config.isActive ? 'bg-success-100 text-success-700' : 'bg-secondary-100 text-secondary-600'
                                                    }`}>
                                                    {config.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            {config.description && (
                                                <p className="text-sm text-secondary-500 mb-2">{config.description}</p>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <code className="px-3 py-1 bg-secondary-50 rounded text-sm font-mono text-secondary-700">
                                                    {showValues ? config.value : config.maskedValue}
                                                </code>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleDeleteConfig(config.id)}
                                                className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Add Configuration Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden">
                            <div className="p-6 border-b border-secondary-100 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-secondary-900">Add New Configuration</h3>
                                <button onClick={() => setShowAddModal(false)} className="text-secondary-400 hover:text-secondary-600">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="label">Category</label>
                                    <select
                                        className="input"
                                        value={newConfig.category}
                                        onChange={(e) => {
                                            const cat = e.target.value;
                                            setNewConfig({ ...newConfig, category: cat, key: '' });
                                            setIsCustomKey(false);
                                            setCustomKey('');
                                        }}
                                    >
                                        {CATEGORIES.map(cat => (
                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="label">Key Name</label>
                                    {PREDEFINED_KEYS[newConfig.category]?.length > 0 ? (
                                        <select
                                            className="input"
                                            value={isCustomKey ? 'CUSTOM' : newConfig.key}
                                            onChange={(e) => {
                                                if (e.target.value === 'CUSTOM') {
                                                    setIsCustomKey(true);
                                                    setNewConfig({ ...newConfig, key: '' });
                                                } else {
                                                    setIsCustomKey(false);
                                                    setNewConfig({ ...newConfig, key: e.target.value });
                                                }
                                            }}
                                        >
                                            <option value="">Select a key or type custom</option>
                                            {PREDEFINED_KEYS[newConfig.category].map(key => (
                                                <option key={key} value={key}>{key}</option>
                                            ))}
                                            <option value="CUSTOM">Custom Key</option>
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="e.g., API_KEY"
                                            value={newConfig.key}
                                            onChange={(e) => setNewConfig({ ...newConfig, key: e.target.value })}
                                        />
                                    )}
                                    {isCustomKey && (
                                        <input
                                            type="text"
                                            className="input mt-2"
                                            placeholder="Enter custom key name"
                                            value={customKey}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setCustomKey(val);
                                                setNewConfig({ ...newConfig, key: val });
                                            }}
                                        />
                                    )}
                                </div>

                                <div>
                                    <label className="label">Value</label>
                                    <input
                                        type="password"
                                        className="input font-mono"
                                        placeholder="Enter the secret value"
                                        value={newConfig.value}
                                        onChange={(e) => setNewConfig({ ...newConfig, value: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="label">Description (Optional)</label>
                                    <textarea
                                        className="input"
                                        rows={2}
                                        placeholder="Brief description of this configuration"
                                        value={newConfig.description}
                                        onChange={(e) => setNewConfig({ ...newConfig, description: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="p-6 border-t border-secondary-100 bg-secondary-50 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveConfig}
                                    disabled={!newConfig.key || !newConfig.value}
                                    className="btn btn-primary flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Save Configuration
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
