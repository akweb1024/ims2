'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

type Tab = 'General' | 'Security' | 'Billing' | 'Notifications';

export default function SettingsPage() {
    const [userRole, setUserRole] = useState('CUSTOMER');
    const [activeTab, setActiveTab] = useState<Tab>('General');
    const [loading, setLoading] = useState(false);

    // User Preferences
    const [theme, setTheme] = useState('light');
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    // System Settings
    const [systemSettings, setSystemSettings] = useState({
        companyName: '',
        supportEmail: '',
        defaultCurrency: 'INR',
        maintenanceMode: false
    });

    const fetchUserSettings = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/settings/user', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTheme(data.theme || 'light');
                setNotificationsEnabled(data.notificationsEnabled);
            }
        } catch (err) {
            console.error('Fetch user settings error:', err);
        }
    }, []);

    const fetchSystemSettings = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/settings/system', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSystemSettings(data);
            }
        } catch (err) {
            console.error('Fetch system settings error:', err);
        }
    }, []);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            setUserRole(user.role);
        }
        fetchUserSettings();
        fetchSystemSettings();
    }, [fetchUserSettings, fetchSystemSettings]);

    const handleUpdateUserPref = async (updates: any) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/settings/user', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                const data = await res.json();
                if (updates.theme) setTheme(data.theme);
                if (updates.notificationsEnabled !== undefined) setNotificationsEnabled(data.notificationsEnabled);
            }
        } catch (err) {
            console.error('Update user pref error:', err);
        }
    };

    const handleUpdateSystemSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/settings/system', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(systemSettings)
            });
            if (res.ok) {
                alert('System settings updated successfully');
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to update settings');
            }
        } catch (err) {
            console.error('Update system settings error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout userRole={userRole}>
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-secondary-900">Settings</h1>
                    <p className="text-secondary-600 mt-1">Manage your account preferences and system configurations</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1">
                        <nav className="space-y-1">
                            {['General', 'Security', 'Billing', 'Notifications'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as Tab)}
                                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === tab
                                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
                                        : 'text-secondary-500 hover:bg-secondary-100'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="md:col-span-2 space-y-6">
                        {activeTab === 'General' && (
                            <>
                                <section className="card-premium">
                                    <h3 className="text-lg font-bold text-secondary-900 mb-6 border-b border-secondary-100 pb-4">Personal Preferences</h3>
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-secondary-900">Dark Mode</p>
                                                <p className="text-sm text-secondary-500">Switch between light and dark themes</p>
                                            </div>
                                            <button
                                                onClick={() => handleUpdateUserPref({ theme: theme === 'light' ? 'dark' : 'light' })}
                                                className={`w-12 h-6 rounded-full transition-all relative ${theme === 'dark' ? 'bg-primary-600' : 'bg-secondary-200'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${theme === 'dark' ? 'translate-x-7' : 'translate-x-1'}`} />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-secondary-900">Push Notifications</p>
                                                <p className="text-sm text-secondary-500">Enable or disable system alerts</p>
                                            </div>
                                            <button
                                                onClick={() => handleUpdateUserPref({ notificationsEnabled: !notificationsEnabled })}
                                                className={`w-12 h-6 rounded-full transition-all relative ${notificationsEnabled ? 'bg-success-500' : 'bg-secondary-200'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notificationsEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                    </div>
                                </section>

                                {userRole === 'SUPER_ADMIN' && (
                                    <section className="card-premium">
                                        <h3 className="text-lg font-bold text-secondary-900 mb-6 border-b border-secondary-100 pb-4">Business Information (Admin Only)</h3>
                                        <form className="space-y-4" onSubmit={handleUpdateSystemSettings}>
                                            <div>
                                                <label className="label">Company Display Name</label>
                                                <input
                                                    type="text"
                                                    className="input"
                                                    value={systemSettings.companyName}
                                                    onChange={(e) => setSystemSettings({ ...systemSettings, companyName: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="label">Support Email</label>
                                                <input
                                                    type="email"
                                                    className="input"
                                                    value={systemSettings.supportEmail}
                                                    onChange={(e) => setSystemSettings({ ...systemSettings, supportEmail: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="label">Default Currency</label>
                                                <select
                                                    className="input"
                                                    value={systemSettings.defaultCurrency}
                                                    onChange={(e) => setSystemSettings({ ...systemSettings, defaultCurrency: e.target.value })}
                                                >
                                                    <option value="INR">INR (₹)</option>
                                                    <option value="USD">USD ($)</option>
                                                    <option value="EUR">EUR (€)</option>
                                                    <option value="GBP">GBP (£)</option>
                                                </select>
                                            </div>
                                            <div className="pt-4">
                                                <button type="submit" disabled={loading} className="btn btn-primary px-8">
                                                    {loading ? 'Saving...' : 'Save Changes'}
                                                </button>
                                            </div>
                                        </form>
                                    </section>
                                )}
                            </>
                        )}

                        {activeTab === 'Security' && (
                            <section className="card-premium">
                                <h3 className="text-lg font-bold text-secondary-900 mb-6 border-b border-secondary-100 pb-4">Security Settings</h3>
                                <form className="space-y-4">
                                    <div>
                                        <label className="label">Current Password</label>
                                        <input type="password" title="current-password" name="current-password" id="current-password" placeholder="••••••••" className="input" />
                                    </div>
                                    <div>
                                        <label className="label">New Password</label>
                                        <input type="password" title="new-password" name="new-password" id="new-password" placeholder="••••••••" className="input" />
                                    </div>
                                    <div>
                                        <label className="label">Confirm New Password</label>
                                        <input type="password" title="confirm-password" name="confirm-password" id="confirm-password" placeholder="••••••••" className="input" />
                                    </div>
                                    <div className="pt-4">
                                        <button type="button" className="btn btn-primary px-8">Update Password</button>
                                    </div>
                                </form>
                            </section>
                        )}

                        {activeTab === 'Notifications' && (
                            <section className="card-premium">
                                <h3 className="text-lg font-bold text-secondary-900 mb-6 border-b border-secondary-100 pb-4">Notification Preferences</h3>
                                <p className="text-secondary-600 mb-6">Manage how you receive alerts and updates.</p>
                                <div className="space-y-4">
                                    {[
                                        { id: 'sub_alerts', label: 'New Subscription Alerts', desc: 'Notify when a new subscription is created' },
                                        { id: 'payment_alerts', label: 'Payment Received', desc: 'Notify when an invoice is marked as paid' },
                                        { id: 'support_alerts', label: 'Support Inquiries', desc: 'Notify when new support tickets arrive' }
                                    ].map(item => (
                                        <div key={item.id} className="flex items-center justify-between p-4 border border-secondary-100 rounded-xl">
                                            <div>
                                                <p className="font-bold text-secondary-900">{item.label}</p>
                                                <p className="text-xs text-secondary-500">{item.desc}</p>
                                            </div>
                                            <input type="checkbox" title={item.id} defaultChecked className="w-5 h-5 accent-primary-600" />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {activeTab === 'Billing' && (
                            <section className="card-premium">
                                <h3 className="text-lg font-bold text-secondary-900 mb-6 border-b border-secondary-100 pb-4">Billing & Invoicing</h3>
                                <div className="space-y-4">
                                    <div className="p-4 bg-secondary-50 rounded-xl">
                                        <p className="text-sm font-bold text-secondary-900">Current Plan</p>
                                        <p className="text-xs text-secondary-500">Enterprise Workspace</p>
                                    </div>
                                    <div>
                                        <label className="label">Invoice Prefix</label>
                                        <input type="text" className="input" defaultValue="STM-" />
                                    </div>
                                    <div>
                                        <label className="label">Tax Percentage (%)</label>
                                        <input type="number" className="input" defaultValue="18" />
                                    </div>
                                    <div className="pt-4">
                                        <button type="button" className="btn btn-primary px-8">Save Invoicing Settings</button>
                                    </div>
                                </div>
                            </section>
                        )}

                        {userRole === 'SUPER_ADMIN' && activeTab === 'General' && (
                            <section className="card-premium border-danger-100">
                                <h3 className="text-lg font-bold text-danger-900 mb-2">Danger Zone</h3>
                                <p className="text-sm text-secondary-500 mb-6">Irreversible actions that affect the entire workspace</p>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-secondary-900">Maintenance Mode</p>
                                        <p className="text-xs text-secondary-500">Restrict access to all users during maintenance</p>
                                    </div>
                                    <button
                                        onClick={() => setSystemSettings({ ...systemSettings, maintenanceMode: !systemSettings.maintenanceMode })}
                                        className={`w-12 h-6 rounded-full transition-all relative ${systemSettings.maintenanceMode ? 'bg-danger-500' : 'bg-secondary-200'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${systemSettings.maintenanceMode ? 'translate-x-7' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
