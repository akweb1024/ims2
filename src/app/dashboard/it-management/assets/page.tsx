'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { Computer, Plus, Search, Filter, AlertCircle, CheckCircle, User, Server, Smartphone, List, LayoutGrid } from 'lucide-react';

export default function ITAssetsPage() {
    const [assets, setAssets] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showModal, setShowModal] = useState(false);
    const [userRole, setUserRole] = useState('');

    // Form State
    const [editingAsset, setEditingAsset] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '',
        type: 'LAPTOP',
        serialNumber: '',
        status: 'AVAILABLE',
        assignedToId: '',
        details: '',
        value: '',
        purchaseDate: ''
    });

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchAssets();
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/employees?all=true', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setEmployees(await res.json());
        } catch (error) {
            console.error('Failed to load employees', error);
        }
    };

    const fetchAssets = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/it/assets', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setAssets(await res.json());
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            const token = localStorage.getItem('token');
            const url = editingAsset ? `/api/it/assets/${editingAsset.id}` : '/api/it/assets';
            const method = editingAsset ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setShowModal(false);
                fetchAssets();
                resetForm();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this asset?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/it/assets/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchAssets();
        } catch (error) {
            console.error(error);
        }
    };

    const resetForm = () => {
        setEditingAsset(null);
        setFormData({ name: '', type: 'LAPTOP', serialNumber: '', status: 'AVAILABLE', assignedToId: '', details: '', value: '', purchaseDate: '' });
    };

    const openEditModal = (asset: any) => {
        setEditingAsset(asset);
        setFormData({
            name: asset.name,
            type: asset.type,
            serialNumber: asset.serialNumber || '',
            status: asset.status,
            assignedToId: asset.assignedToId || '',
            details: asset.details || '',
            value: asset.value?.toString() || '',
            purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split('T')[0] : ''
        });
        setShowModal(true);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'LAPTOP': return <Computer className="text-blue-500" />;
            case 'DESKTOP': return <Computer className="text-indigo-500" />;
            case 'MOBILE': return <Smartphone className="text-green-500" />;
            case 'SERVER': return <Server className="text-slate-500" />;
            default: return <Computer className="text-gray-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'AVAILABLE': return 'bg-green-100 text-green-700 border-green-200';
            case 'ASSIGNED': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'MAINTENANCE': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'RETIRED': return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'LOST': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'IT_MANAGER', 'IT_ADMIN'].includes(userRole);

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900 tracking-tighter">IT Asset Inventory</h1>
                        <p className="text-secondary-500 font-medium">Track hardware, software licenses, and peripherals.</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white shadow text-primary-600' : 'text-secondary-400 hover:bg-secondary-100'}`}
                        >
                            <LayoutGrid size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white shadow text-primary-600' : 'text-secondary-400 hover:bg-secondary-100'}`}
                        >
                            <List size={20} />
                        </button>
                        <button
                            onClick={() => { resetForm(); setShowModal(true); }}
                            className="btn btn-primary px-6 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary-200 flex items-center gap-2"
                        >
                            <Plus size={16} /> Add Asset
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Assets', val: assets.length, color: 'bg-white' },
                        { label: 'Assigned', val: assets.filter(a => a.status === 'ASSIGNED').length, color: 'bg-blue-50 text-blue-700' },
                        { label: 'Available', val: assets.filter(a => a.status === 'AVAILABLE').length, color: 'bg-green-50 text-green-700' },
                        { label: 'Maintenance', val: assets.filter(a => a.status === 'MAINTENANCE').length, color: 'bg-orange-50 text-orange-700' },
                    ].map((s, i) => (
                        <div key={i} className={`p-4 rounded-2xl border border-secondary-100 shadow-sm ${s.color}`}>
                            <div className="text-2xl font-black">{s.val}</div>
                            <div className="text-xs font-bold uppercase tracking-widest opacity-60">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Content */}
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {assets.map(asset => (
                            <div key={asset.id} className="card-premium hover:border-primary-300 transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-secondary-50 rounded-2xl group-hover:bg-primary-50 transition-colors">
                                        {getIcon(asset.type)}
                                    </div>
                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getStatusColor(asset.status)}`}>
                                        {asset.status}
                                    </span>
                                </div>
                                <h3 className="font-bold text-lg text-secondary-900 truncate">{asset.name}</h3>
                                <div className="text-xs font-mono text-secondary-400 mb-4">{asset.serialNumber || 'No Serial #'}</div>

                                <div className="pt-4 border-t border-secondary-50 space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-secondary-400 font-medium">Assigned To</span>
                                        <span className="font-bold text-secondary-900">{asset.assignedTo?.name || 'Unassigned'}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-secondary-400 font-medium">Value</span>
                                        <span className="font-bold text-secondary-900">{asset.value ? `$${asset.value}` : '-'}</span>
                                    </div>
                                    {isAdmin && (
                                        <div className="flex gap-2 pt-2">
                                            <button onClick={() => openEditModal(asset)} className="text-[10px] font-black uppercase text-primary-600 hover:text-primary-700">Edit</button>
                                            <button onClick={() => handleDelete(asset.id)} className="text-[10px] font-black uppercase text-red-600 hover:text-red-700">Delete</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl shadow-sm border border-secondary-200 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-secondary-50 text-secondary-500 font-black uppercase tracking-widest text-[10px]">
                                <tr>
                                    <th className="p-4">Asset Name</th>
                                    <th className="p-4">Type</th>
                                    <th className="p-4">Serial #</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Assigned To</th>
                                    <th className="p-4">Purchase Date</th>
                                    {isAdmin && <th className="p-4 text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-100">
                                {assets.map(asset => (
                                    <tr key={asset.id} className="hover:bg-secondary-50 transition-colors">
                                        <td className="p-4 font-bold text-secondary-900">{asset.name}</td>
                                        <td className="p-4 text-xs font-bold text-secondary-500 uppercase">{asset.type}</td>
                                        <td className="p-4 font-mono text-xs text-secondary-400">{asset.serialNumber || '-'}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getStatusColor(asset.status)}`}>
                                                {asset.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-secondary-700">{asset.assignedTo?.name || '-'}</td>
                                        <td className="p-4 text-secondary-400 text-xs">{asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : '-'}</td>
                                        {isAdmin && (
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => openEditModal(asset)} className="p-1 hover:bg-primary-50 rounded text-primary-600 transition-colors">
                                                        <span className="text-[10px] font-black uppercase">Edit</span>
                                                    </button>
                                                    <button onClick={() => handleDelete(asset.id)} className="p-1 hover:bg-red-50 rounded text-red-600 transition-colors">
                                                        <span className="text-[10px] font-black uppercase">Del</span>
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Create Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                            <div className="p-6 bg-secondary-900 text-white flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-black uppercase tracking-widest">{editingAsset ? 'Update Asset' : 'Register New Asset'}</h2>
                                    <p className="text-white/60 text-xs font-medium">{editingAsset ? 'Modify asset details' : 'Add hardware to inventory'}</p>
                                </div>
                                <div className="p-2 bg-white/10 rounded-xl">
                                    <Computer size={24} />
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Name / Model</label>
                                        <input
                                            className="input w-full font-bold"
                                            placeholder="e.g. MacBook Pro M3"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Type</label>
                                        <select
                                            className="input w-full font-bold"
                                            value={formData.type}
                                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        >
                                            <option value="LAPTOP">Laptop</option>
                                            <option value="DESKTOP">Desktop</option>
                                            <option value="MOBILE">Mobile / Tablet</option>
                                            <option value="Peripherals">Peripherals</option>
                                            <option value="LICENSE">Software License</option>
                                            <option value="SERVER">Server / Network</option>
                                            <option value="OTHER">Other</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Serial Number</label>
                                        <input
                                            className="input w-full font-mono text-xs"
                                            placeholder="S/N"
                                            value={formData.serialNumber}
                                            onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Status</label>
                                        <select
                                            className="input w-full font-bold"
                                            value={formData.status}
                                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                                        >
                                            <option value="AVAILABLE">Available</option>
                                            <option value="ASSIGNED">Assigned</option>
                                            <option value="MAINTENANCE">Maintenance</option>
                                            <option value="RETIRED">Retired</option>
                                            <option value="LOST">Lost / Stolen</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Value (Cost)</label>
                                        <input
                                            type="number"
                                            className="input w-full"
                                            placeholder="0.00"
                                            value={formData.value}
                                            onChange={e => setFormData({ ...formData, value: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Purchase Date</label>
                                        <input
                                            type="date"
                                            className="input w-full"
                                            value={formData.purchaseDate}
                                            onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Assign To Employee</label>
                                    <select
                                        className="input w-full font-bold mb-4"
                                        value={formData.assignedToId}
                                        onChange={e => setFormData({ ...formData, assignedToId: e.target.value })}
                                    >
                                        <option value="">-- Unassigned --</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.name} ({emp.employeeId || 'No ID'})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Technical Specs / Details</label>
                                    <textarea
                                        className="input w-full h-20 text-sm"
                                        placeholder="Processor, RAM, Storage details..."
                                        value={formData.details}
                                        onChange={e => setFormData({ ...formData, details: e.target.value })}
                                    />
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button onClick={() => { setShowModal(false); resetForm(); }} className="btn btn-secondary flex-1 py-3 font-bold rounded-xl">Cancel</button>
                                    <button onClick={handleSubmit} className="btn btn-primary flex-1 py-3 font-bold rounded-xl shadow-lg shadow-primary-200">
                                        {editingAsset ? 'Update' : 'Save'} Asset
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
