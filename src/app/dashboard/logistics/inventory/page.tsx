'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import { Search, Plus, Package, MapPin, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function InventoryLedgerPage() {
    const [inventory, setInventory] = useState<any[]>([]);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState({
        sku: '',
        name: '',
        category: 'GENERAL',
        warehouseId: '',
        quantity: 0,
        minStockLevel: 10,
        unitPrice: 0,
        description: ''
    });

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/logistics/inventory?search=${encodeURIComponent(searchTerm)}`);
            if (res.ok) {
                const data = await res.json();
                setInventory(data.inventory);
                setWarehouses(data.warehouses);
            } else {
                toast.error('Failed to load inventory');
            }
        } catch (err) {
            console.error('Fetch error:', err);
            toast.error('Network error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(fetchInventory, 300);
        return () => clearTimeout(timeout);
    }, [searchTerm]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/logistics/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success('Item added to Inventory successfully!');
                setShowCreateModal(false);
                setFormData({ sku: '', name: '', category: 'GENERAL', warehouseId: '', quantity: 0, minStockLevel: 10, unitPrice: 0, description: '' });
                fetchInventory();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to add item');
            }
        } catch (err) {
            console.error(err);
            toast.error('Network error. Try again.');
        }
    };

    const getStatusColor = (current: number, min: number) => {
        if (current === 0) return 'bg-danger-100 text-danger-700';
        if (current <= min) return 'bg-warning-100 text-warning-700 font-bold';
        return 'bg-success-100 text-success-700';
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900 tracking-tight flex items-center gap-3">
                            <Package className="text-primary-600" size={32} />
                            Inventory Ledger
                        </h1>
                        <p className="text-secondary-500 font-medium mt-1">
                            Track real-time stock levels, raw materials, and warehouse allocations.
                        </p>
                    </div>
                    
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="btn-premium px-6 py-2.5 rounded-2xl flex items-center gap-2 group shadow-xl shadow-primary-500/20"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                        <span>Allocate New Asset</span>
                    </button>
                </div>

                {/* Toolbar */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-4 shadow-xl shadow-secondary-200/50 border border-white flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search by SKU or Item Name..."
                            className="w-full pl-11 pr-4 py-3 bg-secondary-50 rounded-2xl border-none focus:ring-2 focus:ring-primary-500 outline-none transition-all font-medium text-secondary-900"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex gap-4 items-center">
                        <div className="flex items-center gap-2 text-xs font-bold text-danger-600 uppercase bg-danger-50 px-3 py-1.5 rounded-lg border border-danger-100">
                            <AlertTriangle size={14} /> 
                            {inventory.filter(i => i.quantity <= i.minStockLevel).length} Low Stock
                        </div>
                        <div className="text-sm font-bold text-secondary-500 uppercase tracking-widest px-4 border-l border-secondary-200">
                            Total Assets: {inventory.length}
                        </div>
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20 text-secondary-400">
                        <Loader2 className="animate-spin mb-4 text-primary-500" size={40} />
                        <p className="font-bold">Scanning warehouse ledgers...</p>
                    </div>
                ) : inventory.length === 0 ? (
                    <div className="text-center p-20 bg-secondary-50 rounded-3xl border border-secondary-200 border-dashed">
                        <Package size={48} className="mx-auto text-secondary-300 mb-4" />
                        <h2 className="text-xl font-black text-secondary-800">No Inventory Found</h2>
                        <p className="text-secondary-500 mt-2">No stock matching your criteria is active in any warehouse.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 gap-6">
                        {inventory.map((item) => (
                            <div key={item.id} className="bg-white rounded-3xl p-6 shadow-lg shadow-secondary-100/50 border border-secondary-100 hover:-translate-y-1 hover:border-primary-200 hover:shadow-xl hover:shadow-primary-100/50 transition-all group flex flex-col h-full relative overflow-hidden">
                                
                                {/* Status Glow */}
                                {item.quantity <= item.minStockLevel && (
                                    <div className="absolute top-0 left-0 w-1 h-full bg-danger-500"></div>
                                )}

                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex flex-col gap-1 w-full pl-2">
                                        <div className="flex justify-between items-start">
                                            <span className="bg-secondary-100 text-secondary-600 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border border-secondary-200 w-max">
                                                {item.category}
                                            </span>
                                            {item.quantity <= item.minStockLevel && (
                                                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-danger-600 bg-danger-50 px-2 py-0.5 rounded-md">
                                                    Restock Required
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-black text-xl text-secondary-900 leading-tight mt-1 line-clamp-2">
                                            {item.name}
                                        </h3>
                                        <div className="text-xs font-mono font-bold text-secondary-500 mt-0.5 flex items-center gap-1.5 bg-secondary-50 border border-secondary-200 px-2 py-0.5 rounded-md w-max">
                                            <span>SKU:</span>
                                            <span className="text-primary-600 tracking-wider">{item.sku}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex-1 space-y-3 mt-4 pt-4 border-t border-secondary-50 pl-2">
                                    <div className="flex items-center gap-3 text-sm font-medium">
                                        <MapPin size={16} className="text-secondary-400" />
                                        <span className={item.warehouse?.name ? 'text-secondary-700 font-bold bg-primary-50 px-2 py-0.5 rounded text-primary-700' : 'text-secondary-400 italic'}>
                                            {item.warehouse?.name || 'Unallocated Virtual'}
                                        </span>
                                    </div>
                                    
                                    <div className="bg-secondary-50 p-3 rounded-2xl flex justify-between items-center border border-secondary-100 mt-2">
                                        <div>
                                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Stock Vol.</p>
                                            <div className="flex items-baseline gap-1.5">
                                                <span className={`text-2xl font-black ${
                                                    item.quantity === 0 ? 'text-danger-500' : 
                                                    item.quantity <= item.minStockLevel ? 'text-warning-600' : 'text-success-600'
                                                }`}>
                                                    {item.quantity}
                                                </span>
                                                <span className="text-xs text-secondary-500 font-bold">/ {item.minStockLevel} Min</span>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Asset Value</p>
                                            <span className="text-sm font-bold text-secondary-900 border border-secondary-200 px-2 py-1 rounded-lg bg-white shadow-sm block">
                                                ₹{(item.quantity * item.unitPrice).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mt-4 pt-4 border-t border-secondary-50 ml-2">
                                     <button className="w-full text-center text-xs font-bold text-primary-600 uppercase tracking-widest p-2 rounded-xl border border-primary-100 bg-primary-50/50 hover:bg-primary-100 hover:text-primary-700 transition-colors flex items-center justify-center gap-2">
                                        Move / Edit Stock <ArrowRight size={14} />
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
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200 border border-secondary-100">
                        <div className="px-8 py-6 border-b border-secondary-100 bg-gradient-to-br from-secondary-50 to-white sticky top-0 z-10">
                            <h2 className="text-2xl font-black text-secondary-900">Add Inventory Asset</h2>
                            <p className="text-secondary-500 font-medium text-sm mt-1">Register a new product, raw material, or supply item.</p>
                        </div>
                        
                        <form onSubmit={handleCreate} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black tracking-widest text-secondary-500 uppercase">Item Name *</label>
                                    <input required type="text" placeholder="E.g., HP Laser Printer Cartridge" className="input-premium w-full" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black tracking-widest text-secondary-500 uppercase">Universal SKU *</label>
                                    <input required type="text" placeholder="ABC-12345" className="input-premium w-full uppercase font-mono tracking-wider" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value.toUpperCase()})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black tracking-widest text-secondary-500 uppercase">Category</label>
                                    <select className="input-premium w-full" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                        <option value="GENERAL">General Supply</option>
                                        <option value="ELECTRONICS">IT / Electronics</option>
                                        <option value="FURNITURE">Furniture</option>
                                        <option value="RAW_MATERIAL">Raw Production Material</option>
                                        <option value="MERCHANDISE">Client Merchandise</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black tracking-widest text-secondary-500 uppercase">Assigned Warehouse</label>
                                    <select className="input-premium w-full" value={formData.warehouseId} onChange={e => setFormData({...formData, warehouseId: e.target.value})}>
                                        <option value="">Virtual Pool (No Physical Location)</option>
                                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.location || 'HQ'})</option>)}
                                    </select>
                                </div>

                                <div className="col-span-1 md:col-span-2 flex gap-4 bg-secondary-50/50 p-4 rounded-3xl border border-secondary-100">
                                     <div className="flex-1 space-y-2">
                                        <label className="text-xs font-black tracking-widest text-secondary-500 uppercase">Initial Qty</label>
                                        <input required type="number" min="0" className="input-premium w-full font-mono text-center" value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <label className="text-xs font-black tracking-widest text-secondary-500 uppercase">Min Warning</label>
                                        <input required type="number" min="0" className="input-premium w-full font-mono text-center text-danger-600" value={formData.minStockLevel} onChange={e => setFormData({...formData, minStockLevel: Number(e.target.value)})} />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <label className="text-xs font-black tracking-widest text-secondary-500 uppercase">Unit Price (₹)</label>
                                        <input required type="number" step="0.01" min="0" className="input-premium w-full font-mono text-center text-success-600" value={formData.unitPrice} onChange={e => setFormData({...formData, unitPrice: Number(e.target.value)})} />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="pt-6 border-t border-secondary-100 flex justify-end gap-3 sticky bottom-0 bg-white shadow-[0_-10px_20px_rgba(255,255,255,0.9)] z-10 pb-0">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="px-6 py-2.5 rounded-xl font-bold text-secondary-600 hover:bg-secondary-100 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-premium px-8 py-2.5 rounded-xl shadow-lg shadow-primary-500/20">
                                    Initialize Item Profile
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
