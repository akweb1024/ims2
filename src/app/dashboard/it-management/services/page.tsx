'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    Plus,
    Search,
    Edit,
    Trash2,
    DollarSign,
    Zap,
    LayoutGrid,
    Loader2,
    AlertCircle,
    X,
    Save,
} from 'lucide-react';

interface ServiceDefinition {
    id: string;
    name: string;
    description: string | null;
    category: string;
    price: number;
    unit: string;
}

export default function ITServiceManagementPage() {
    const [services, setServices] = useState<ServiceDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<ServiceDefinition | null>(null);
    const [modalData, setModalData] = useState({
        name: '',
        description: '',
        category: 'GENERAL',
        price: '',
        unit: 'each'
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/it/services');
            if (response.ok) {
                const data = await response.json();
                setServices(data);
            }
        } catch (error) {
            console.error('Failed to fetch services:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (service: ServiceDefinition | null = null) => {
        if (service) {
            setEditingService(service);
            setModalData({
                name: service.name,
                description: service.description || '',
                category: service.category,
                price: service.price.toString(),
                unit: service.unit
            });
        } else {
            setEditingService(null);
            setModalData({
                name: '',
                description: '',
                category: 'GENERAL',
                price: '',
                unit: 'each'
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const url = editingService
                ? `/api/it/services/${editingService.id}`
                : '/api/it/services';
            const method = editingService ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...modalData,
                    price: parseFloat(modalData.price)
                }),
            });

            if (response.ok) {
                setIsModalOpen(false);
                fetchServices();
            } else {
                const err = await response.json();
                alert(err.error || 'Failed to save service');
            }
        } catch (error) {
            console.error('Error saving service:', error);
            alert('An unexpected error occurred');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this service? It will no longer be available for new requests.')) {
            return;
        }

        try {
            const response = await fetch(`/api/it/services/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                fetchServices();
            } else {
                alert('Failed to delete service');
            }
        } catch (error) {
            console.error('Error deleting service:', error);
        }
    };

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="p-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <Zap className="h-8 w-8 text-blue-600" />
                            IT Service Management
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Define and price the services your IT department provides
                        </p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-all w-fit"
                    >
                        <Plus className="h-5 w-5" />
                        Add New Service
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm mb-6 flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search services..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="text-sm font-medium text-gray-500 whitespace-nowrap">
                        {filteredServices.length} Services
                    </div>
                </div>

                {/* List */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
                        <p className="text-gray-500 mt-4 font-medium">Loading services...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredServices.map((service) => (
                            <div
                                key={service.id}
                                className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl">
                                        <LayoutGrid className="h-6 w-6" />
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleOpenModal(service)}
                                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"
                                            title="Edit"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(service.id)}
                                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{service.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-6">
                                    {service.description || 'No description provided.'}
                                </p>
                                <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-700">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Price</span>
                                        <span className="text-xl font-black text-gray-900 dark:text-white flex items-center">
                                            ₹{service.price}
                                            <span className="text-xs font-normal text-gray-500 ml-1">/ {service.unit}</span>
                                        </span>
                                    </div>
                                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-[10px] font-bold uppercase tracking-widest">
                                        {service.category}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {editingService ? 'Edit Service' : 'Add New Service'}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                            <form onSubmit={handleSave} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Service Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={modalData.name}
                                        onChange={(e) => setModalData({ ...modalData, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g., SEO Optimization"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                    <textarea
                                        value={modalData.description}
                                        onChange={(e) => setModalData({ ...modalData, description: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                        rows={3}
                                        placeholder="What does this service entail?"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Price (INR) *</label>
                                        <input
                                            type="number"
                                            required
                                            value={modalData.price}
                                            onChange={(e) => setModalData({ ...modalData, price: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Unit</label>
                                        <input
                                            type="text"
                                            value={modalData.unit}
                                            onChange={(e) => setModalData({ ...modalData, unit: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="each, page, hour..."
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Category</label>
                                    <select
                                        value={modalData.category}
                                        onChange={(e) => setModalData({ ...modalData, category: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="GENERAL">General</option>
                                        <option value="SOFTWARE">Software</option>
                                        <option value="HARDWARE">Hardware</option>
                                        <option value="SUPPORT">Support</option>
                                        <option value="INFRASTRUCTURE">Infrastructure</option>
                                        <option value="REVENUE">Revenue</option>
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg font-bold hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-lg flex items-center justify-center gap-2"
                                    >
                                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        {editingService ? 'Update Service' : 'Create Service'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
