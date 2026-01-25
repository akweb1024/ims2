'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    ArrowLeft, Ticket, Calendar, DollarSign, User, Mail,
    Briefcase, Phone, Utensils, Shirt, CheckCircle, AlertCircle
} from 'lucide-react';

export default function RegisterPage() {
    const params = useParams();
    const router = useRouter();
    const conferenceId = params.id as string;

    const [conference, setConference] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');
    const [user, setUser] = useState<any>(null);

    const [selectedTicket, setSelectedTicket] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const fetchConference = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/conferences/${conferenceId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setConference(data);
                if (data.ticketTypes?.length > 0) {
                    setSelectedTicket(data.ticketTypes[0].id);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [conferenceId]);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            const u = JSON.parse(userData);
            setUserRole(u.role);
            setUser(u);
        }
        fetchConference();
    }, [fetchConference]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        // Add ticket ID manually as it might not be in form if using custom selector
        data.ticketTypeId = selectedTicket;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/conferences/${conferenceId}/registrations`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                const reg = await res.json();
                alert('Registration successful!');
                router.push(`/dashboard/conferences/${conferenceId}`); // Ideally redirect to a receipt page or My Registrations
            } else {
                const err = await res.json();
                setError(err.error || 'Failed to register');
            }
        } catch (error) {
            console.error(error);
            setError('An error occurred during registration');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!conference) return <div className="p-8 text-center">Conference not found</div>;

    const selectedTicketType = conference.ticketTypes.find((t: any) => t.id === selectedTicket);

    return (
        <DashboardLayout userRole={userRole}>
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Link href={`/dashboard/conferences/${conferenceId}`} className="btn btn-secondary btn-sm">
                        <ArrowLeft size={16} /> Back
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">Register for Conference</h1>
                        <p className="text-secondary-500">{conference.title}</p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-2">
                        <AlertCircle size={20} />
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Registration Form */}
                    <div className="lg:col-span-2 space-y-6">
                        <form onSubmit={handleSubmit} className="card-premium p-6 space-y-6">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <User className="text-primary-600" /> Attendee Information
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Full Name *</label>
                                    <input
                                        name="name"
                                        className="input w-full"
                                        required
                                        defaultValue={user?.name || ''}
                                    />
                                </div>
                                <div>
                                    <label className="label">Email *</label>
                                    <input
                                        name="email"
                                        type="email"
                                        className="input w-full"
                                        required
                                        defaultValue={user?.email || ''}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="label">Organization / University</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                                    <input name="organization" className="input w-full pl-10" placeholder="e.g. Acme Corp" />
                                </div>
                            </div>

                            <div>
                                <label className="label">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                                    <input name="phone" className="input w-full pl-10" placeholder="+1 234 567 8900" />
                                </div>
                            </div>

                            <hr className="border-secondary-100" />

                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Utensils className="text-primary-600" /> Preferences
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Dietary Requirements</label>
                                    <select name="dietaryRequirements" className="input w-full">
                                        <option value="">None</option>
                                        <option value="Vegetarian">Vegetarian</option>
                                        <option value="Vegan">Vegan</option>
                                        <option value="Gluten-Free">Gluten-Free</option>
                                        <option value="Halal">Halal</option>
                                        <option value="Kosher">Kosher</option>
                                        <option value="Other">Other (Please specify at desk)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label">T-Shirt Size</label>
                                    <select name="tshirtSize" className="input w-full">
                                        <option value="">Select Size...</option>
                                        <option value="XS">XS</option>
                                        <option value="S">S</option>
                                        <option value="M">M</option>
                                        <option value="L">L</option>
                                        <option value="XL">XL</option>
                                        <option value="XXL">XXL</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={submitting || !selectedTicket || error !== ''}
                                    className="btn btn-primary w-full py-4 text-lg shadow-lg shadow-primary-200"
                                >
                                    {submitting ? 'Registering...' : `Complete Registration • ${selectedTicketType?.currency} ${selectedTicketType?.price}`}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Ticket Selection Sidebar */}
                    <div className="space-y-6">
                        <div className="card-premium p-6 bg-secondary-50 border-secondary-200">
                            <h3 className="font-bold text-xl mb-4 text-secondary-900">Select Ticket</h3>
                            <div className="space-y-3">
                                {conference.ticketTypes?.map((ticket: any) => {
                                    const isSoldOut = ticket.limit && ticket.soldCount >= ticket.limit;
                                    return (
                                        <label
                                            key={ticket.id}
                                            className={`relative flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedTicket === ticket.id
                                                ? 'border-primary-500 bg-white shadow-md'
                                                : 'border-secondary-200 bg-white hover:border-primary-200'
                                                } ${isSoldOut ? 'opacity-50 grayscale pointer-events-none' : ''}`}
                                        >
                                            <input
                                                type="radio"
                                                name="ticket_selector"
                                                value={ticket.id}
                                                checked={selectedTicket === ticket.id}
                                                onChange={() => setSelectedTicket(ticket.id)}
                                                className="absolute top-4 right-4 w-5 h-5 accent-primary-600"
                                                disabled={isSoldOut}
                                            />
                                            <span className="font-bold text-lg text-secondary-900">{ticket.name}</span>
                                            <span className="text-2xl font-black text-primary-600 my-1">
                                                {ticket.currency} {ticket.price}
                                            </span>
                                            {isSoldOut ? (
                                                <span className="text-red-500 font-bold text-sm bg-red-50 px-2 py-1 rounded w-fit">SOLD OUT</span>
                                            ) : (
                                                <span className="text-secondary-500 text-sm">
                                                    {ticket.limit ? `${ticket.limit - ticket.soldCount} remaining` : 'Unlimited'}
                                                </span>
                                            )}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="card-premium p-6">
                            <h3 className="font-bold text-md mb-2">Order Summary</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-secondary-500">Conference</span>
                                    <span className="font-medium">{conference.title}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-secondary-500">Date</span>
                                    <span className="font-medium">{new Date(conference.startDate).toLocaleDateString()}</span>
                                </div>
                                <div className="border-t border-secondary-100 my-2 pt-2 flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span>
                                        {selectedTicketType
                                            ? `${selectedTicketType.currency} ${selectedTicketType.price}`
                                            : '-'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
