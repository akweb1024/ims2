'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import { Search, Plus, Store, Mail, Phone, MapPin, Loader2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VendorsPage() {
    const [vendors, setVendors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        contactName: '',
        email: '',
        phone: '',
        address: '',
        taxId: '',
        status: 'ACTIVE'
    });

    const fetchVendors = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/supply-chain/vendors?search=${encodeURIComponent(searchTerm)}`);
            if (res.ok) {
                setVendors(await res.json());
            } else {
                toast.error('Failed to load vendors');
            }
        } catch (err) {
            console.error('Fetch error:', err);
            toast.error('Network error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(fetchVendors, 300);
        return () => clearTimeout(timeout);
    }, [searchTerm]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/supply-chain/vendors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success('Vendor created successfully!');
                setShowCreateModal(false);
                setFormData({ name: '', contactName: '', email: '', phone: '', address: '', taxId: '', status: 'ACTIVE' });
                fetchVendors();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to create vendor');
            }
        } catch (err) {
            console.error(err);
            toast.error('Network error. Try again.');
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900 tracking-tight flex items-center gap-3">
                            <Store className="text-primary-600" size={32} />
                            Vendor Directory
                        </h1>
                        <p className="text-secondary-500 font-medium mt-1">
                            Manage all your B2B supplier and procurement relationships.
                        </p>
                    </div>
                    
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="btn-premium px-6 py-2.5 rounded-2xl flex items-center gap-2 group shadow-xl shadow-primary-500/20"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                        <span>Add New Vendor</span>
                    </button>
                </div>

                {/* Toolbar */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-4 shadow-xl shadow-secondary-200/50 border border-white flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search vendors by name, email, contact..."
                            className="w-full pl-11 pr-4 py-3 bg-secondary-50 rounded-2xl border-none focus:ring-2 focus:ring-primary-500 outline-none transition-all font-medium text-secondary-900"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm font-bold text-secondary-500 uppercase tracking-widest px-4">
                        <span>Total Records: {vendors.length}</span>
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20 text-secondary-400">
                        <Loader2 className="animate-spin mb-4 text-primary-500" size={40} />
                        <p className="font-bold">Loading directory...</p>
                    </div>
                ) : vendors.length === 0 ? (
                    <div className="text-center p-20 bg-secondary-50 rounded-3xl border border-secondary-200 border-dashed">
                        <Store size={48} className="mx-auto text-secondary-300 mb-4" />
                        <h2 className="text-xl font-black text-secondary-800">No Vendors Found</h2>
                        <p className="text-secondary-500 mt-2">Adjust your search or add a new vendor to your directory.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {vendors.map((vendor) => (
                            <div key={vendor.id} className="bg-white rounded-3xl p-6 shadow-lg shadow-secondary-100/50 border border-secondary-100 hover:border-primary-200 hover:shadow-xl hover:shadow-primary-100 transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center font-black text-xl text-primary-700">
                                            {vendor.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-secondary-900 leading-tight">
                                                {vendor.name}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                                    vendor.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-secondary-100 text-secondary-500'
                                                }`}>
                                                    {vendor.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-3 mt-6 pt-6 border-t border-secondary-50">
                                    {vendor.contactName && (
                                        <div className="flex items-start gap-3 text-secondary-600 text-sm font-medium">
                                            <Store size={16} className="text-secondary-400 mt-0.5" />
                                            <span>Contact: {vendor.contactName}</span>
                                        </div>
                                    )}
                                    {vendor.email && (
                                        <div className="flex items-start gap-3 text-secondary-600 text-sm font-medium">
                                            <Mail size={16} className="text-secondary-400 mt-0.5" />
                                            <span>{vendor.email}</span>
                                        </div>
                                    )}
                                    {vendor.phone && (
                                        <div className="flex items-start gap-3 text-secondary-600 text-sm font-medium">
                                            <Phone size={16} className="text-secondary-400 mt-0.5" />
                                            <span>{vendor.phone}</span>
                                        </div>
                                    )}
                                    {vendor.address && (
                                        <div className="flex items-start gap-3 text-secondary-600 text-sm font-medium">
                                            <MapPin size={16} className="text-secondary-400 mt-0.5" />
                                            <span className="line-clamp-2">{vendor.address}</span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="mt-6 flex justify-between items-center px-4 py-3 bg-secondary-50 rounded-2xl">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Linked POs</span>
                                        <span className="font-bold text-sm text-secondary-900">{vendor._count?.purchaseOrders || 0}</span>
                                    </div>
                                    <button className="text-primary-600 group-hover:text-primary-700 bg-white p-2 rounded-xl shadow-sm border border-secondary-200 transition-colors">
                                        <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-secondary-100">
                        <div className="px-8 py-6 border-b border-secondary-100 bg-gradient-to-br from-secondary-50 to-white">
                            <h2 className="text-2xl font-black text-secondary-900">Add New Vendor</h2>
                            <p className="text-secondary-500 font-medium text-sm mt-1">Register a new supplier for procurement.</p>
                        </div>
                        
                        <form onSubmit={handleCreate} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-1 md:col-span-2 space-y-2">
                                    <label className="text-xs font-black tracking-widest text-secondary-500 uppercase">Vendor Name *</label>
                                    <input required type="text" className="input-premium w-full" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black tracking-widest text-secondary-500 uppercase">Contact Person</label>
                                    <input type="text" className="input-premium w-full" value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black tracking-widest text-secondary-500 uppercase">Tax ID / GSTIN</label>
                                    <input type="text" className="input-premium w-full" value={formData.taxId} onChange={e => setFormData({...formData, taxId: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black tracking-widest text-secondary-500 uppercase">Email Address</label>
                                    <input type="email" className="input-premium w-full" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black tracking-widest text-secondary-500 uppercase">Phone Number</label>
                                    <input type="text" className="input-premium w-full" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                </div>
                                <div className="col-span-1 md:col-span-2 space-y-2">
                                    <label className="text-xs font-black tracking-widest text-secondary-500 uppercase">Billing Address</label>
                                    <textarea className="input-premium w-full py-3" rows={2} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}></textarea>
                                </div>
                            </div>
                            
                            <div className="pt-6 border-t border-secondary-100 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="px-6 py-2.5 rounded-xl font-bold text-secondary-600 hover:bg-secondary-100 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-premium px-8 py-2.5 rounded-xl shadow-lg shadow-primary-500/20">
                                    Save Vendor
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
