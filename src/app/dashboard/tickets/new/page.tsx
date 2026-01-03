'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default function NewTicketPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [customers, setCustomers] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState('');

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const u = JSON.parse(userData);
            setUser(u);

            // If staff, fetch customers to create ticket on their behalf
            if (u.role !== 'CUSTOMER') {
                fetchCustomers();
            }
        }
    }, []);

    const fetchCustomers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/customers?limit=100', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const result = await res.json();
                setCustomers(result.data || []);
            }
        } catch (err) {
            console.error('Fetch customers error:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const payload = {
            subject: formData.get('subject'),
            description: formData.get('description'),
            priority: formData.get('priority'),
            customerProfileId: user?.role === 'CUSTOMER' ? undefined : formData.get('customerProfileId'),
        };

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/support/tickets', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                router.push('/dashboard/tickets');
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create ticket');
            }
        } catch (error) {
            alert('An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout userRole={user?.role}>
            <div className="max-w-3xl mx-auto space-y-6">
                <div>
                    <button
                        onClick={() => router.back()}
                        className="text-primary-600 hover:text-primary-700 font-bold flex items-center mb-4 transition-all"
                    >
                        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Tickets
                    </button>
                    <h1 className="text-3xl font-extrabold text-secondary-900">Create Support Ticket</h1>
                    <p className="text-secondary-600">Submit a new inquiry to our support team</p>
                </div>

                <div className="card-premium p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {user?.role !== 'CUSTOMER' && (
                            <div>
                                <label className="label">Select Customer</label>
                                <select
                                    name="customerProfileId"
                                    className="input"
                                    required
                                    value={selectedCustomer}
                                    onChange={(e) => setSelectedCustomer(e.target.value)}
                                >
                                    <option value="">-- Select Customer --</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} ({c.primaryEmail}) - {c.organizationName || 'Individual'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="label">Subject</label>
                            <input
                                name="subject"
                                placeholder="Brief summary of the issue"
                                className="input"
                                required
                            />
                        </div>

                        <div>
                            <label className="label">Priority</label>
                            <select name="priority" className="input" defaultValue="MEDIUM">
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="URGENT">Urgent</option>
                            </select>
                        </div>

                        <div>
                            <label className="label">Description</label>
                            <textarea
                                name="description"
                                placeholder="Detailed description of your request..."
                                className="input h-40"
                                required
                            ></textarea>
                        </div>

                        <div className="pt-4 border-t border-secondary-100 flex justify-end space-x-4">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="btn btn-secondary px-8"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn btn-primary px-12 font-bold shadow-xl shadow-primary-200"
                            >
                                {loading ? 'Submitting...' : 'Create Ticket'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="bg-primary-50 border border-primary-100 p-6 rounded-2xl flex items-start gap-4">
                    <div className="text-3xl">💡</div>
                    <div>
                        <h4 className="font-bold text-primary-900">Pro Tip</h4>
                        <p className="text-sm text-primary-700 leading-relaxed">
                            A clear and detailed description helps our team resolve your issue faster.
                            Include any relevant error messages or steps to reproduce the issue.
                        </p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
