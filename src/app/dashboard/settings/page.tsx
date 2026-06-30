'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

type Tab = 'General' | 'Security' | 'Notifications' | 'Allocations' | 'Dashboard';

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

    const [departments, setDepartments] = useState<any[]>([]);
    const [allocationRules, setAllocationRules] = useState<any[]>([]);
    const [savingAllocations, setSavingAllocations] = useState(false);
    const [dashboardSettings, setDashboardSettings] = useState<any>(null);
    const [attendanceRules, setAttendanceRules] = useState({
        timezone: 'Asia/Kolkata',
        lateCheckInTime: '09:30',
        shortLeaveTime: '10:30',
        graceMinutes: 0
    });
    const [employeeOverride, setEmployeeOverride] = useState({
        employeeId: '',
        lateCheckInTime: '',
        shortLeaveTime: '',
        graceMinutes: 0,
        notes: ''
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

    const fetchAllocationData = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const depRes = await fetch('/api/hr/departments', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (depRes.ok) {
                setDepartments(await depRes.json());
            }
            const ruleRes = await fetch('/api/settings/expense-allocations', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (ruleRes.ok) {
                setAllocationRules(await ruleRes.json());
            }
        } catch (err) {
            console.error('Fetch allocation data error:', err);
        }
    }, []);

    const fetchDashboardData = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const [widgetRes, attendanceRes] = await Promise.all([
                fetch('/api/settings/dashboard-widgets', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch('/api/settings/attendance-rules', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (widgetRes.ok) {
                setDashboardSettings(await widgetRes.json());
            }

            if (attendanceRes.ok) {
                const data = await attendanceRes.json();
                const source = data.company || data.global;
                if (source) {
                    setAttendanceRules({
                        timezone: source.timezone || 'Asia/Kolkata',
                        lateCheckInTime: source.lateCheckInTime || '09:30',
                        shortLeaveTime: source.shortLeaveTime || '10:30',
                        graceMinutes: source.graceMinutes || 0,
                    });
                }
            }
        } catch (err) {
            console.error('Fetch dashboard data error:', err);
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
        if (activeTab === 'Allocations') {
            fetchAllocationData();
        }
        if (activeTab === 'Dashboard') {
            fetchDashboardData();
        }
    }, [fetchUserSettings, fetchSystemSettings, fetchAllocationData, fetchDashboardData, activeTab]);

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

    const tabs: Tab[] = [
        'General',
        'Security',
        'Notifications',
        ...(['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER'].includes(userRole) ? ['Dashboard' as Tab] : []),
        ...(['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'].includes(userRole) ? ['Allocations' as Tab] : [])
    ];

    const tabIcons: Record<Tab, string> = {
        'General': '⚙️',
        'Security': '🔐',
        'Notifications': '🔔',
        'Dashboard': '🧩',
        'Allocations': '📊'
    };

    const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
        <div>
            <label className="label mb-1">{label}</label>
            {hint && <p className="text-xs text-secondary-400 mb-1">{hint}</p>}
            {children}
        </div>
    );

    return (
        <DashboardLayout userRole={userRole}>
            <div className="max-w-5xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-secondary-900">Settings</h1>
                    <p className="text-secondary-600 mt-1">Manage your account preferences and system configurations</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="md:col-span-1">
                        <nav className="space-y-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === tab
                                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-200'
                                        : 'text-secondary-500 hover:bg-secondary-100'
                                        }`}
                                >
                                    <span>{tabIcons[tab]}</span>
                                    {tab}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="md:col-span-3 space-y-6">

                        {/* ─── GENERAL TAB ─── */}
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
                                                <input type="text" className="input" value={systemSettings.companyName}
                                                    onChange={(e) => setSystemSettings({ ...systemSettings, companyName: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="label">Support Email</label>
                                                <input type="email" className="input" value={systemSettings.supportEmail}
                                                    onChange={(e) => setSystemSettings({ ...systemSettings, supportEmail: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="label">Default Currency</label>
                                                <select className="input" value={systemSettings.defaultCurrency}
                                                    onChange={(e) => setSystemSettings({ ...systemSettings, defaultCurrency: e.target.value })}>
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

                        {/* ─── DASHBOARD TAB ─── */}
                        {activeTab === 'Dashboard' && (
                            <>
                                <section className="card-premium">
                                    <h3 className="text-lg font-bold text-secondary-900 mb-6 border-b border-secondary-100 pb-4">Dashboard Widgets</h3>
                                    <div className="space-y-4">
                                        {(dashboardSettings?.catalog || []).map((widget: any) => (
                                            <div key={widget.key} className="rounded-2xl border border-secondary-200 bg-white p-4">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <p className="font-bold text-secondary-900">{widget.title}</p>
                                                        <p className="text-sm text-secondary-500">{widget.description}</p>
                                                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-secondary-400">
                                                            {widget.category} • {(widget.supportedScopes || []).join(', ')}
                                                        </p>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${widget.isActive ? 'bg-success-100 text-success-700' : 'bg-secondary-100 text-secondary-600'}`}>
                                                        {widget.isActive ? 'Active' : 'Disabled'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="card-premium">
                                    <h3 className="text-lg font-bold text-secondary-900 mb-6 border-b border-secondary-100 pb-4">Attendance Rules</h3>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <Field label="Timezone">
                                            <input className="input" value={attendanceRules.timezone} onChange={(e) => setAttendanceRules({ ...attendanceRules, timezone: e.target.value })} />
                                        </Field>
                                        <Field label="Late Check-in Time">
                                            <input className="input" value={attendanceRules.lateCheckInTime} onChange={(e) => setAttendanceRules({ ...attendanceRules, lateCheckInTime: e.target.value })} />
                                        </Field>
                                        <Field label="Short Leave Time">
                                            <input className="input" value={attendanceRules.shortLeaveTime} onChange={(e) => setAttendanceRules({ ...attendanceRules, shortLeaveTime: e.target.value })} />
                                        </Field>
                                        <Field label="Grace Minutes">
                                            <input type="number" className="input" value={attendanceRules.graceMinutes} onChange={(e) => setAttendanceRules({ ...attendanceRules, graceMinutes: Number(e.target.value) })} />
                                        </Field>
                                    </div>
                                    <div className="mt-4 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const token = localStorage.getItem('token');
                                                const res = await fetch('/api/settings/attendance-rules', {
                                                    method: 'PATCH',
                                                    headers: {
                                                        'Authorization': `Bearer ${token}`,
                                                        'Content-Type': 'application/json'
                                                    },
                                                    body: JSON.stringify(attendanceRules)
                                                });
                                                if (res.ok) {
                                                    alert('Attendance rules updated');
                                                } else {
                                                    const data = await res.json();
                                                    alert(data.error || 'Failed to update attendance rules');
                                                }
                                            }}
                                            className="btn btn-primary"
                                        >
                                            Save Attendance Rules
                                        </button>
                                    </div>
                                </section>

                                <section className="card-premium">
                                    <h3 className="text-lg font-bold text-secondary-900 mb-6 border-b border-secondary-100 pb-4">Employee Overrides</h3>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <Field label="Employee ID">
                                            <input className="input" value={employeeOverride.employeeId} onChange={(e) => setEmployeeOverride({ ...employeeOverride, employeeId: e.target.value })} />
                                        </Field>
                                        <Field label="Late Check-in Time">
                                            <input className="input" value={employeeOverride.lateCheckInTime} onChange={(e) => setEmployeeOverride({ ...employeeOverride, lateCheckInTime: e.target.value })} />
                                        </Field>
                                        <Field label="Short Leave Time">
                                            <input className="input" value={employeeOverride.shortLeaveTime} onChange={(e) => setEmployeeOverride({ ...employeeOverride, shortLeaveTime: e.target.value })} />
                                        </Field>
                                        <Field label="Grace Minutes">
                                            <input type="number" className="input" value={employeeOverride.graceMinutes} onChange={(e) => setEmployeeOverride({ ...employeeOverride, graceMinutes: Number(e.target.value) })} />
                                        </Field>
                                        <div className="md:col-span-2">
                                            <Field label="Notes">
                                                <textarea className="input min-h-24" value={employeeOverride.notes} onChange={(e) => setEmployeeOverride({ ...employeeOverride, notes: e.target.value })} />
                                            </Field>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const token = localStorage.getItem('token');
                                                const res = await fetch('/api/settings/attendance-rules/employee', {
                                                    method: 'PATCH',
                                                    headers: {
                                                        'Authorization': `Bearer ${token}`,
                                                        'Content-Type': 'application/json'
                                                    },
                                                    body: JSON.stringify(employeeOverride)
                                                });
                                                if (res.ok) {
                                                    alert('Employee override saved');
                                                } else {
                                                    const data = await res.json();
                                                    alert(data.error || 'Failed to save override');
                                                }
                                            }}
                                            className="btn btn-secondary"
                                        >
                                            Save Employee Override
                                        </button>
                                    </div>
                                </section>
                            </>
                        )}

                        {/* ─── SECURITY TAB ─── */}
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

                        {/* Invoice Settings are now managed in dashboard/company → Company Settings tab */}

                        {/* ─── NOTIFICATIONS TAB ─── */}
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

                        {/* ─── ALLOCATIONS TAB ─── */}
                        {activeTab === 'Allocations' && (
                            <section className="card-premium">
                                <h3 className="text-lg font-bold text-secondary-900 mb-2 border-b border-secondary-100 pb-4">Departmental Expense Allocation</h3>
                                <p className="text-sm text-secondary-500 mb-6">Configure what percentage of employee-generated revenue is dynamically allocated as departmental expenses.</p>
                                <div className="space-y-4">
                                    {departments.map((dept) => {
                                        const rule = allocationRules.find(r => r.departmentId === dept.id);
                                        return (
                                            <div key={dept.id} className="flex items-center justify-between p-4 bg-secondary-50 rounded-2xl border border-secondary-100">
                                                <div>
                                                    <p className="font-bold text-secondary-900">{dept.name}</p>
                                                    <p className="text-[10px] uppercase font-black text-secondary-400 tracking-wider">Department ID: {dept.id.split('-')[0]}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="number"
                                                        className="w-24 text-right px-3 py-2 border rounded-xl font-bold bg-white"
                                                        placeholder="0"
                                                        min="0"
                                                        max="100"
                                                        value={rule?.percentage || 0}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            setAllocationRules(prev => {
                                                                const filtered = prev.filter(r => r.departmentId !== dept.id);
                                                                return [...filtered, { departmentId: dept.id, percentage: val }];
                                                            });
                                                        }}
                                                    />
                                                    <span className="font-bold text-secondary-400">%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {departments.length === 0 && <p className="text-center text-secondary-400 italic py-8">No departments found.</p>}
                                    <div className="pt-6">
                                        <button
                                            onClick={async () => {
                                                setSavingAllocations(true);
                                                try {
                                                    const token = localStorage.getItem('token');
                                                    const res = await fetch('/api/settings/expense-allocations', {
                                                        method: 'POST',
                                                        headers: {
                                                            'Authorization': `Bearer ${token}`,
                                                            'Content-Type': 'application/json'
                                                        },
                                                        body: JSON.stringify({ rules: allocationRules })
                                                    });
                                                    if (res.ok) alert('Allocation rules saved successfully!');
                                                } catch (err) {
                                                    console.error(err);
                                                    alert('Failed to save rules');
                                                } finally {
                                                    setSavingAllocations(false);
                                                }
                                            }}
                                            disabled={savingAllocations || departments.length === 0}
                                            className="btn btn-primary px-10"
                                        >
                                            {savingAllocations ? 'Saving...' : 'Save Allocation Rules'}
                                        </button>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Danger Zone / Logs */}
                        {userRole === 'SUPER_ADMIN' && activeTab === 'General' && (
                            <>
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
                                <section className="card-premium mt-6 bg-secondary-900 text-white overflow-hidden relative">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                                    <div className="relative z-10 flex justify-between items-center">
                                        <div>
                                            <h3 className="text-lg font-bold mb-2">System Logs</h3>
                                            <p className="text-secondary-300 text-xs max-w-sm">View detailed logs of system emails, errors, and critical events for debugging.</p>
                                        </div>
                                        <a href="/dashboard/settings/email-logs" className="bg-white text-secondary-900 px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-secondary-100 transition-colors">
                                            View Logs
                                        </a>
                                    </div>
                                </section>
                                <section className="card-premium mt-6 overflow-hidden relative">
                                    <div className="relative z-10 flex justify-between items-center">
                                        <div>
                                            <h3 className="text-lg font-bold mb-2 text-secondary-900">Revenue Share</h3>
                                            <p className="text-secondary-500 text-xs max-w-sm">Classify departments and define how support/production departments earn a fixed share of revenue across companies.</p>
                                        </div>
                                        <a href="/dashboard/settings/revenue-share" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-indigo-700 transition-colors">
                                            Configure
                                        </a>
                                    </div>
                                </section>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
