'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Plus, Search, Edit, Trash2, Zap, LayoutGrid, Loader2, X, Save } from 'lucide-react';

interface ServiceDefinition {
    id: string; name: string; description: string | null;
    category: string; price: number; unit: string; estimatedDays: number | null;
}

const CATEGORY_COLORS: Record<string, string> = {
    GENERAL: 'bg-secondary-100 text-secondary-600',
    SOFTWARE: 'bg-primary-100 text-primary-700',
    HARDWARE: 'bg-orange-100 text-orange-700',
    SUPPORT: 'bg-warning-100 text-warning-700',
    INFRASTRUCTURE: 'bg-indigo-100 text-indigo-700',
    REVENUE: 'bg-success-100 text-success-700',
};

export default function ITServiceManagementPage() {
    const [services, setServices] = useState<ServiceDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<ServiceDefinition | null>(null);
    const [modalData, setModalData] = useState({ name: '', description: '', category: 'GENERAL', price: '', unit: 'each', estimatedDays: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchServices(); }, []);

    const fetchServices = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/it/services');
            if (response.ok) setServices(await response.json());
        } catch (error) { console.error('Failed to fetch services:', error); }
        finally { setLoading(false); }
    };

    const handleOpenModal = (service: ServiceDefinition | null = null) => {
        if (service) {
            setEditingService(service);
            setModalData({ name: service.name, description: service.description || '', category: service.category, price: service.price.toString(), unit: service.unit, estimatedDays: service.estimatedDays?.toString() || '' });
        } else {
            setEditingService(null);
            setModalData({ name: '', description: '', category: 'GENERAL', price: '', unit: 'each', estimatedDays: '' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const url = editingService ? `/api/it/services/${editingService.id}` : '/api/it/services';
            const response = await fetch(url, {
                method: editingService ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...modalData, price: parseFloat(modalData.price), estimatedDays: modalData.estimatedDays ? parseInt(modalData.estimatedDays) : null }),
            });
            if (response.ok) { setIsModalOpen(false); fetchServices(); }
            else { const err = await response.json(); alert(err.error || 'Failed to save service'); }
        } catch { alert('An unexpected error occurred'); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this service? It will no longer be available for new requests.')) return;
        try {
            const response = await fetch(`/api/it/services/${id}`, { method: 'DELETE' });
            if (response.ok) fetchServices();
            else alert('Failed to delete service');
        } catch (error) { console.error('Error deleting service:', error); }
    };

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-secondary-900 flex items-center gap-3">
                            <span className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
                                <Zap className="h-5 w-5 text-primary-600" />
                            </span>
                            IT Service Management
                        </h1>
                        <p className="text-secondary-500 mt-1 text-sm">Define and price the services your IT department provides</p>
                    </div>
                    <button onClick={() => handleOpenModal()} className="btn btn-primary text-sm">
                        <Plus className="h-4 w-4" /> Add New Service
                    </button>
                </div>

                {/* Search */}
                <div className="card-premium">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
                            <input type="text" placeholder="Search services..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-premium pl-10" />
                        </div>
                        <div className="text-sm font-semibold text-secondary-400 whitespace-nowrap">{filteredServices.length} Services</div>
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 text-primary-600 animate-spin mb-4" />
                        <p className="text-secondary-500 text-sm">Loading services...</p>
                    </div>
                ) : filteredServices.length === 0 ? (
                    <div className="card-premium flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-secondary-100 flex items-center justify-center mb-4">
                            <LayoutGrid className="h-7 w-7 text-secondary-400" />
                        </div>
                        <p className="text-secondary-500 text-sm">No services found. Add your first IT service.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredServices.map((service) => (
                            <div key={service.id} className="card-premium hover:border-primary-200 group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                                        <LayoutGrid className="h-5 w-5 text-primary-600" />
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleOpenModal(service)} className="p-2 hover:bg-secondary-100 rounded-lg text-secondary-500 hover:text-primary-600 transition-colors" title="Edit">
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => handleDelete(service.id)} className="p-2 hover:bg-danger-50 rounded-lg text-secondary-500 hover:text-danger-600 transition-colors" title="Delete">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="text-base font-bold text-secondary-900 mb-1">{service.name}</h3>
                                <p className="text-sm text-secondary-500 line-clamp-2 mb-5">{service.description || 'No description provided.'}</p>
                                <div className="flex items-center justify-between pt-4 border-t border-secondary-100">
                                    <div>
                                        <span className="text-xs text-secondary-400 font-bold uppercase tracking-wider">Price</span>
                                        <p className="text-xl font-black text-secondary-900">
                                            ₹{service.price}<span className="text-xs font-normal text-secondary-400 ml-1">/ {service.unit}</span>
                                        </p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${CATEGORY_COLORS[service.category] || 'bg-secondary-100 text-secondary-600'}`}>
                                        {service.category}
                                    </span>
                                </div>
                                {service.estimatedDays && (
                                    <p className="text-xs text-secondary-400 mt-2">~{service.estimatedDays} day{service.estimatedDays !== 1 ? 's' : ''} to complete</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                            <div className="p-6 border-b border-secondary-100 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-secondary-900">{editingService ? 'Edit Service' : 'Add New Service'}</h3>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-secondary-100 rounded-lg transition-colors">
                                    <X className="h-5 w-5 text-secondary-500" />
                                </button>
                            </div>
                            <form onSubmit={handleSave} className="p-6 space-y-4">
                                <div>
                                    <label className="label-premium">Service Name *</label>
                                    <input type="text" required value={modalData.name} onChange={(e) => setModalData({ ...modalData, name: e.target.value })} className="input-premium" placeholder="e.g., SEO Optimization" />
                                </div>
                                <div>
                                    <label className="label-premium">Description</label>
                                    <textarea value={modalData.description} onChange={(e) => setModalData({ ...modalData, description: e.target.value })} className="input-premium" rows={3} placeholder="What does this service entail?" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label-premium">Price (INR) *</label>
                                        <input type="number" required value={modalData.price} onChange={(e) => setModalData({ ...modalData, price: e.target.value })} className="input-premium" placeholder="200" />
                                    </div>
                                    <div>
                                        <label className="label-premium">Unit</label>
                                        <input type="text" value={modalData.unit} onChange={(e) => setModalData({ ...modalData, unit: e.target.value })} className="input-premium" placeholder="each, page, hour..." />
                                    </div>
                                </div>
                                <div>
                                    <label className="label-premium">Category</label>
                                    <select value={modalData.category} onChange={(e) => setModalData({ ...modalData, category: e.target.value })} className="input-premium">
                                        <option value="GENERAL">General</option>
                                        <option value="SOFTWARE">Software</option>
                                        <option value="HARDWARE">Hardware</option>
                                        <option value="SUPPORT">Support</option>
                                        <option value="INFRASTRUCTURE">Infrastructure</option>
                                        <option value="REVENUE">Revenue</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="label-premium">Estimated Fulfillment (Days)</label>
                                    <input type="number" value={modalData.estimatedDays} onChange={(e) => setModalData({ ...modalData, estimatedDays: e.target.value })} className="input-premium" placeholder="e.g., 2" />
                                    <p className="text-xs text-secondary-400 mt-1">Leave empty if not applicable.</p>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 btn border border-secondary-200 text-secondary-600 hover:bg-secondary-50">Cancel</button>
                                    <button type="submit" disabled={saving} className="flex-1 btn btn-primary">
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
