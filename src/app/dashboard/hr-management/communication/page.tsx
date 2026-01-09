'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Mail, Send, Users, CheckCircle, AlertCircle, Filter } from 'lucide-react';

export default function CommunicationPage() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // Form State
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [selectedRole, setSelectedRole] = useState('ALL');
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/employees', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setEmployees(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredEmployees = employees.filter(e =>
        selectedRole === 'ALL' || e.user.role === selectedRole
    );

    const toggleSelectAll = () => {
        if (selectedEmployees.length === filteredEmployees.length) {
            setSelectedEmployees([]);
        } else {
            setSelectedEmployees(filteredEmployees.map(e => e.user.email));
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedEmployees.length === 0) return alert('Please select at least one recipient');

        setSending(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/communication/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recipients: selectedEmployees,
                    subject,
                    message
                })
            });

            if (res.ok) {
                const data = await res.json();
                alert(`Emails Sent Successfully! Success: ${data.stats.success}, Failed: ${data.stats.failed}`);
                setSubject('');
                setMessage('');
                setSelectedEmployees([]);
            } else {
                alert('Failed to send emails');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSending(false);
        }
    };

    const roles = Array.from(new Set(employees.map(e => e.user.role)));

    return (
        <DashboardLayout userRole="ADMIN">
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-black text-secondary-900">Internal Communication</h1>
                    <p className="text-secondary-500">Send updates, announcements, and alerts to staff.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Compose */}
                    <div className="lg:col-span-2">
                        <div className="card-premium p-6 h-full flex flex-col">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Send size={20} className="text-primary-600" />
                                Compose Message
                            </h3>
                            <form onSubmit={handleSend} className="space-y-4 flex-1 flex flex-col">
                                <div>
                                    <label className="label">Recipients</label>
                                    <div className="p-3 bg-secondary-50 rounded-xl border border-secondary-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Users size={18} className="text-secondary-400" />
                                            <span className="font-bold text-secondary-700">{selectedEmployees.length} selected</span>
                                        </div>
                                        <button type="button" onClick={() => setSelectedEmployees([])} className="text-xs text-primary-600 font-bold hover:underline">Clear</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Subject</label>
                                    <input required className="input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Important Update: Policy Change" />
                                </div>
                                <div className="flex-1">
                                    <label className="label">Message</label>
                                    <textarea required className="input h-full min-h-[300px]" value={message} onChange={e => setMessage(e.target.value)} placeholder="Type your message here..." />
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <button disabled={sending || selectedEmployees.length === 0} className="btn btn-primary px-8 py-3 font-bold shadow-xl flex items-center gap-2">
                                        {sending ? 'Sending...' : 'Send Broadcast'} <Send size={18} />
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Right: Recipient Selector */}
                    <div className="space-y-4 h-[calc(100vh-140px)] flex flex-col">
                        <div className="card-premium p-4 bg-secondary-900 text-white border-0">
                            <div className="flex items-center gap-2 mb-4">
                                <Filter size={18} className="text-primary-400" />
                                <h3 className="font-bold">Filter Staff</h3>
                            </div>
                            <select
                                className="w-full bg-secondary-800 border border-secondary-700 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:border-primary-500"
                                value={selectedRole}
                                onChange={e => setSelectedRole(e.target.value)}
                            >
                                <option value="ALL">All Roles</option>
                                {roles.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                            </select>
                        </div>

                        <div className="card-premium p-0 flex-1 overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-secondary-100 flex justify-between items-center bg-secondary-50">
                                <h3 className="font-bold text-secondary-700">Staff List</h3>
                                <button type="button" onClick={toggleSelectAll} className="text-xs font-black text-primary-600 hover:text-primary-700 uppercase tracking-wider">
                                    {selectedEmployees.length === filteredEmployees.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                            <div className="overflow-y-auto flex-1 p-2 space-y-1">
                                {isLoading ? (
                                    <div className="p-4 text-center text-sm text-secondary-400">Loading staff...</div>
                                ) : filteredEmployees.map(emp => (
                                    <div
                                        key={emp.id}
                                        onClick={() => {
                                            if (selectedEmployees.includes(emp.user.email)) {
                                                setSelectedEmployees(prev => prev.filter(e => e !== emp.user.email));
                                            } else {
                                                setSelectedEmployees(prev => [...prev, emp.user.email]);
                                            }
                                        }}
                                        className={`p-3 rounded-lg cursor-pointer transition-all flex items-center gap-3 ${selectedEmployees.includes(emp.user.email) ? 'bg-primary-50 border border-primary-200 shadow-sm' : 'hover:bg-secondary-50 border border-transparent'}`}
                                    >
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedEmployees.includes(emp.user.email) ? 'bg-primary-600 border-primary-600' : 'border-secondary-300 bg-white'}`}>
                                            {selectedEmployees.includes(emp.user.email) && <CheckCircle size={14} className="text-white" />}
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className={`text-xs font-bold truncate ${selectedEmployees.includes(emp.user.email) ? 'text-primary-900' : 'text-secondary-700'}`}>{emp.user.email}</p>
                                            <p className="text-[10px] text-secondary-400 truncate">{emp.designation || 'Staff'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
