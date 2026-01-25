
'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Plus, Calendar, User, DollarSign, Briefcase } from 'lucide-react';

export default function InternshipsPage() {
    const [internships, setInternships] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        fetchInternships();
    }, []);

    const fetchInternships = async () => {
        try {
            const res = await fetch('/api/lms/internships');
            if (res.ok) {
                setInternships(await res.json());
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            const res = await fetch('/api/lms/internships', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                setIsCreating(false);
                fetchInternships();
            } else {
                alert('Failed to create internship');
            }
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return <div className="p-8">Loading internships...</div>;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">Internships</h1>
                        <p className="text-secondary-500">Manage internship programs and applications</p>
                    </div>
                    <button onClick={() => setIsCreating(true)} className="btn btn-primary flex gap-2">
                        <Plus size={20} /> Create Internship
                    </button>
                </div>

                {isCreating && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <h3 className="text-xl font-bold mb-4">Create New Internship</h3>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="label">Title</label>
                                        <input name="title" className="input" required />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="label">Description</label>
                                        <textarea name="description" className="input h-24" required />
                                    </div>
                                    <div>
                                        <label className="label">Start Date</label>
                                        <input name="startDate" type="date" className="input" required />
                                    </div>
                                    <div>
                                        <label className="label">Duration</label>
                                        <input name="duration" className="input" placeholder="e.g. 6 Months" />
                                    </div>
                                    <div>
                                        <label className="label">Stipend (Monthly)</label>
                                        <input name="stipend" type="number" className="input" defaultValue="0" />
                                    </div>
                                    <div>
                                        <label className="label">Program Fee (if any)</label>
                                        <input name="price" type="number" className="input" defaultValue="0" />
                                    </div>
                                    <div>
                                        <label className="label">Mentor (User ID)</label>
                                        <input name="mentorId" className="input" placeholder="User ID" />
                                    </div>
                                    <div>
                                        <label className="label">Mentor Reward</label>
                                        <input name="mentorReward" type="number" className="input" defaultValue="0" />
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-4">
                                    <button type="submit" className="btn btn-primary flex-1">Create</button>
                                    <button type="button" onClick={() => setIsCreating(false)} className="btn btn-secondary">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {internships.map(item => (
                        <div key={item.id} className="card-dashboard p-0 overflow-hidden group hover:border-primary-200 transition-all">
                            <div className="h-32 bg-secondary-100 flex items-center justify-center">
                                <Briefcase size={48} className="text-secondary-300" />
                            </div>
                            <div className="p-6">
                                <h3 className="font-bold text-lg text-secondary-900 mb-2">{item.title}</h3>
                                <div className="space-y-2 text-sm text-secondary-500">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} />
                                        <span>Starts {new Date(item.startDate).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <User size={14} />
                                        <span>{item.mentor?.name || 'No Mentor'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <DollarSign size={14} />
                                        <span>Stipend: {item.currency} {item.stipend}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
}
