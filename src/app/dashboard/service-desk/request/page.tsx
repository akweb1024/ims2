'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    LifeBuoy,
    Send,
    AlertCircle,
    CheckCircle2,
    Clock,
    User,
    ArrowLeft,
    Zap,
    LayoutGrid,
    Search,
    Loader2,
    Paperclip,
    Check,
} from 'lucide-react';

interface Service {
    id: string;
    name: string;
    description: string | null;
    category: string;
    price: number;
    unit: string;
    estimatedDays: number | null;
}

export default function RequestITServicePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [success, setSuccess] = useState(false);
    const [services, setServices] = useState<Service[]>([]);
    const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'MEDIUM',
        quantity: 1,
        attachments: [] as string[]
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            const response = await fetch('/api/it/services');
            if (response.ok) {
                const data = await response.json();
                setServices(data);
            }
        } catch (error) {
            console.error('Failed to fetch services:', error);
        } finally {
            setFetching(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedServiceId) {
            alert('Please select a service');
            return;
        }

        const newErrors: Record<string, string> = {};
        if (!formData.title.trim()) newErrors.title = 'Please provide a title for your request';
        if (!formData.description.trim()) newErrors.description = 'Please describe your requirement';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);
        try {
            const service = services.find(s => s.id === selectedServiceId);
            const totalEstimatedValue = (service?.price || 0) * formData.quantity;

            const response = await fetch('/api/it/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.title,
                    description: `[SERVICE: ${service?.name}] (Qty: ${formData.quantity} ${service?.unit})\n\n${formData.description}`,
                    category: 'SERVICE_REQUEST',
                    type: 'SERVICE_REQUEST',
                    priority: formData.priority,
                    estimatedValue: totalEstimatedValue,
                    isRevenueBased: true,
                    status: 'PENDING',
                    serviceId: selectedServiceId,
                    attachments: formData.attachments
                }),
            });

            if (response.ok) {
                setSuccess(true);
                setTimeout(() => {
                    router.push('/dashboard/it-services');
                }, 2000);
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to submit request');
            }
        } catch (error) {
            console.error('Request submission error:', error);
            alert('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (success) {
        return (
            <DashboardLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto text-center p-6">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 className="h-10 w-10 text-green-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Request Submitted!</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">
                        Your IT service request has been received. Our team will look into it shortly.
                        You will be notified once the task is ready for your acceptance.
                    </p>
                    <button
                        onClick={() => router.push('/dashboard/it-services')}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        Go to My Requests
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    const selectedService = services.find(s => s.id === selectedServiceId);

    return (
        <DashboardLayout>
            <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto page-animate">
                {/* Header */}
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-start sm:items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2.5 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-all border border-transparent hover:border-gray-200 dark:hover:border-gray-700 shadow-sm hover:shadow-md group"
                        >
                            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400 group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                                    <LifeBuoy className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                                    Request IT Service
                                </h1>
                            </div>
                            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 font-medium">
                                Browse available services and submit your requirement
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Service Selection */}
                        <section>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                                <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white flex items-center gap-3 uppercase tracking-tighter">
                                    <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-500/30">1</span>
                                    Select Service
                                </h2>
                                <div className="relative w-full sm:w-72">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Find a service..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 text-sm font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                                    />
                                </div>
                            </div>

                            {fetching ? (
                                <div className="flex justify-center flex-col items-center py-10 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-2" />
                                    <p className="text-sm text-gray-500">Fetching available services...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredServices.map((service) => (
                                        <button
                                            key={service.id}
                                            type="button"
                                            onClick={() => setSelectedServiceId(service.id)}
                                            className={`transition-all duration-300 text-left relative overflow-hidden group ${selectedServiceId === service.id
                                                ? 'glass-card-premium border-blue-500 scale-[1.02] shadow-blue-500/10'
                                                : 'glass-card-premium border-gray-100 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-900/50 hover:scale-[1.01]'
                                                } rounded-2xl border p-5`}
                                        >
                                            <div className="flex items-start gap-4 pr-10">
                                                <div className={`p-3 rounded-xl transition-colors ${selectedServiceId === service.id
                                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                                    : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50'
                                                    }`}>
                                                    <Zap className="h-6 w-6" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2 mb-1">
                                                        <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">
                                                            {service.name}
                                                        </h3>
                                                        <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded shrink-0">
                                                            ₹{service.price}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                                        {service.description || `IT Support for ${service.name}`}
                                                    </p>
                                                </div>
                                            </div>

                                            {selectedServiceId === service.id && (
                                                <div className="absolute top-4 right-4">
                                                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30">
                                                        <Check className="h-3.5 w-3.5 text-white" />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    ~{service.estimatedDays} Days
                                                </span>
                                                <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">Select &rarr;</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Request Details */}
                        {selectedServiceId && (
                            <form onSubmit={handleSubmit} className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                                <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white flex items-center gap-3 uppercase tracking-tighter">
                                    <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-500/30">2</span>
                                    Request Details
                                </h2>

                                <div className="glass-card-premium rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <LayoutGrid className="h-5 w-5" />
                                            <span className="font-bold">{selectedService?.name}</span>
                                        </div>
                                        <div className="text-[10px] sm:text-sm font-bold opacity-80 uppercase tracking-widest">
                                            Step 2 of 2
                                        </div>
                                    </div>
                                    <div className="p-4 sm:p-6 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div className="md:col-span-3">
                                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Short Title *</label>
                                                <input
                                                    type="text"
                                                    value={formData.title}
                                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white ${errors.title ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                                                    placeholder="e.g., SEO for Publications Page"
                                                />
                                                {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Quantity ({selectedService?.unit})</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={formData.quantity}
                                                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                                                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Detailed Requirement *</label>
                                            <textarea
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                rows={4}
                                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white ${errors.description ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                                                placeholder="Please provide specific details for this service request..."
                                            />
                                            {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
                                        </div>

                                        <div className="pt-2">
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Attachments (Reference Documents/Screenshots)</label>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {formData.attachments.map((url, i) => (
                                                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs dark:text-gray-300">
                                                        <Paperclip className="h-3 w-3" />
                                                        <span className="max-w-[150px] truncate">{url.split('/').pop()}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, attachments: formData.attachments.filter((_, idx) => idx !== i) })}
                                                            className="text-red-500 hover:text-red-700 ml-1"
                                                        >
                                                            &times;
                                                        </button>
                                                    </div>
                                                ))}
                                                {formData.attachments.length === 0 && (
                                                    <p className="text-xs text-gray-400 italic">No files attached.</p>
                                                )}
                                            </div>
                                            <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors w-fit">
                                                <Paperclip className="h-4 w-4 text-gray-500" />
                                                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Upload Reference</span>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const uploadData = new FormData();
                                                            uploadData.append('file', file);
                                                            uploadData.append('category', 'documents');
                                                            try {
                                                                const res = await fetch('/api/upload', { method: 'POST', body: uploadData });
                                                                if (res.ok) {
                                                                    const { url } = await res.json();
                                                                    setFormData({ ...formData, attachments: [...formData.attachments, url] });
                                                                }
                                                            } catch (err) {
                                                                console.error('Upload failed', err);
                                                            }
                                                        }
                                                    }}
                                                />
                                            </label>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Urgency</label>
                                                <select
                                                    value={formData.priority}
                                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="LOW">Low - Normal timeline</option>
                                                    <option value="MEDIUM">Medium - Urgent need</option>
                                                    <option value="HIGH">High - Immediate attention</option>
                                                    <option value="URGENT">Critical - Blocker</option>
                                                </select>
                                            </div>
                                            <div className="glass-card-premium p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col justify-center">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Estimated Value</span>
                                                <span className="text-xl sm:text-2xl font-black text-blue-600">
                                                    ₹{((selectedService?.price || 0) * formData.quantity).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50/50 dark:bg-gray-900/40 px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-4 justify-between items-center group">
                                        <div className="flex items-center gap-2 text-[10px] sm:text-xs text-gray-500">
                                            <AlertCircle className="h-4 w-4" />
                                            IT Points will be credited upon your acceptance.
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-all disabled:opacity-50"
                                        >
                                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                            Submit Request
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* Sidebar / Info */}
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-indigo-700 to-blue-800 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                            <h3 className="text-2xl font-black mb-6 flex items-center gap-2">
                                <Zap className="h-7 w-7" />
                                The Process
                            </h3>
                            <div className="space-y-6 relative z-10">
                                <div className="flex gap-4">
                                    <div className="flex flex-col items-center">
                                        <div className="w-6 h-6 rounded-full bg-white text-blue-700 flex items-center justify-center text-xs font-bold">1</div>
                                        <div className="w-px h-full bg-white/30 my-1"></div>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm">Submit Request</h4>
                                        <p className="text-xs text-blue-100 opacity-80">Describe your need and select the quantity required.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex flex-col items-center">
                                        <div className="w-6 h-6 rounded-full bg-white text-blue-700 flex items-center justify-center text-xs font-bold">2</div>
                                        <div className="w-px h-full bg-white/30 my-1"></div>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm">IT Fulfillment</h4>
                                        <p className="text-xs text-blue-100 opacity-80">The IT team picks up the task and works on fulfillment.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex flex-col items-center">
                                        <div className="w-6 h-6 rounded-full bg-white text-blue-700 flex items-center justify-center text-xs font-bold">3</div>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm">Review &amp; Accept</h4>
                                        <p className="text-xs text-blue-100 opacity-80">Once done, you review the solution and &quot;Accept&quot; to finalize.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-amber-500" />
                                Key Info
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                                Paid services are internal utility requests. The value (points) mentioned helps track IT department utility and efficiency within the organization.
                            </p>
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg text-[10px] font-bold text-amber-700 dark:text-amber-500 border border-amber-100 dark:border-amber-900/20">
                                ⚠️ REWORK POLICY: Corrections requested after acceptance may incur additional &quot;Correction&quot; service points.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
