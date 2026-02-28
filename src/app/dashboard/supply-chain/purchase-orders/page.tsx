'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import { Search, Plus, FileText, ShoppingCart, Loader2, ArrowRight, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PurchaseOrdersPage() {
    const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
    const [vendors, setVendors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [showCreateModal, setShowCreateModal] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState({
        vendorId: '',
        poNumber: '',
        status: 'DRAFT',
        expectedDate: '',
        items: [{ description: '', quantity: 1, unitPrice: 0 }]
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const [poRes, vendorRes] = await Promise.all([
                fetch(`/api/supply-chain/purchase-orders?search=${encodeURIComponent(searchTerm)}&status=${filterStatus}`),
                fetch(`/api/supply-chain/vendors`)
            ]);
            
            if (poRes.ok) setPurchaseOrders(await poRes.json());
            if (vendorRes.ok) {
                const vendorData = await vendorRes.json();
                setVendors(vendorData.filter((v:any) => v.status === 'ACTIVE'));
            }
        } catch (err) {
            console.error('Fetch error:', err);
            toast.error('Network error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(loadData, 300);
        return () => clearTimeout(timeout);
    }, [searchTerm, filterStatus]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!formData.vendorId) return toast.error('Please select a vendor.');
        
        try {
            const res = await fetch('/api/supply-chain/purchase-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success('Purchase Order Generated successfully!');
                setShowCreateModal(false);
                setFormData({ vendorId: '', poNumber: '', status: 'DRAFT', expectedDate: '', items: [{ description: '', quantity: 1, unitPrice: 0 }] });
                loadData();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to create PO');
            }
        } catch (err) {
            console.error(err);
            toast.error('Network error. Try again.');
        }
    };

    const addLineItem = () => {
        setFormData({
            ...formData, 
            items: [...formData.items, { description: '', quantity: 1, unitPrice: 0 }]
        });
    };

    const removeLineItem = (index: number) => {
        const newItems = [...formData.items];
        newItems.splice(index, 1);
        setFormData({ ...formData, items: newItems });
    };

    const updateLineItem = (index: number, field: string, value: any) => {
        const newItems = [...formData.items] as any;
        newItems[index][field] = value;
        setFormData({ ...formData, items: newItems });
    };

    const calculateTotal = () => {
        return formData.items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0);
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900 tracking-tight flex items-center gap-3">
                            <ShoppingCart className="text-primary-600" size={32} />
                            Purchase Orders
                        </h1>
                        <p className="text-secondary-500 font-medium mt-1">
                            Track supply requisitions and vendor invoices.
                        </p>
                    </div>
                    
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="btn-premium px-6 py-2.5 rounded-2xl flex items-center gap-2 group shadow-xl shadow-primary-500/20"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                        <span>Create new PO</span>
                    </button>
                </div>

                {/* Toolbar */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-4 shadow-xl shadow-secondary-200/50 border border-white flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96 flex gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search by PO Number or Vendor..."
                                className="w-full pl-11 pr-4 py-3 bg-secondary-50 rounded-2xl border-none focus:ring-2 focus:ring-primary-500 outline-none transition-all font-medium text-secondary-900"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select 
                            className="bg-secondary-50 rounded-2xl px-4 py-3 outline-none w-40 font-medium text-secondary-700 font-bold"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="ALL">All Status</option>
                            <option value="DRAFT">DRAFT</option>
                            <option value="ISSUED">ISSUED</option>
                            <option value="PARTIAL">PARTIAL</option>
                            <option value="COMPLETED">COMPLETED</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-bold text-secondary-500 uppercase tracking-widest px-4">
                        <span>Total POs: {purchaseOrders.length}</span>
                    </div>
                </div>

                {/* PO Table */}
                <div className="card-premium overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-secondary-50 border-b border-secondary-100 text-[10px] uppercase font-black tracking-widest text-secondary-500">
                                    <th className="px-6 py-4">PO Details</th>
                                    <th className="px-6 py-4">Vendor</th>
                                    <th className="px-6 py-4">Total Amount</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Expected Date</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-50">
                                {loading ? (
                                    [1, 2, 3].map(i => <tr key={i} className="animate-pulse"><td colSpan={6} className="p-8 h-4"></td></tr>)
                                ) : purchaseOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-20 text-center text-secondary-400 font-bold italic">No Purchase Orders found.</td>
                                    </tr>
                                ) : purchaseOrders.map(po => (
                                    <tr key={po.id} className="hover:bg-primary-50/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-white border border-secondary-200 flex items-center justify-center shadow-sm">
                                                    <FileText size={18} className="text-secondary-400" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-secondary-900">{po.poNumber}</p>
                                                    <p className="text-[10px] text-secondary-400 font-mono tracking-widest font-bold">
                                                        <FormattedDate date={po.createdAt} />
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-secondary-700">
                                            {po.vendor?.name}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm border border-secondary-200 w-max px-2.5 py-1 rounded-lg bg-green-50 text-green-700 font-bold tracking-tight">
                                                ₹{po.totalAmount.toLocaleString()}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-lg font-black uppercase text-[10px] tracking-wider ${
                                                po.status === 'DRAFT' ? 'bg-secondary-100 text-secondary-600' :
                                                po.status === 'ISSUED' ? 'bg-blue-100 text-blue-700' :
                                                po.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                                {po.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-semibold text-secondary-500">
                                            {po.expectedDate ? <FormattedDate date={po.expectedDate} /> : 'TBA'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-primary-600 font-bold text-xs hover:text-primary-700 p-2 bg-white shadow-sm border border-secondary-200 rounded-lg group-hover:shadow-md transition-all">
                                                View Items ({po.items?.length || 0})
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200 border border-secondary-100">
                        <div className="px-8 py-6 border-b border-secondary-100 bg-gradient-to-br from-secondary-50 to-white sticky top-0 z-10 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-black text-secondary-900">Generate Purchase Order</h2>
                                <p className="text-secondary-500 font-medium text-sm mt-1">Add items to purchase from specific vendors.</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase text-secondary-400 tracking-widest">Total Amount</p>
                                <p className="text-2xl font-black text-green-600 tracking-tight">₹{calculateTotal().toLocaleString()}</p>
                            </div>
                        </div>
                        
                        <form onSubmit={handleCreate} className="p-8 space-y-6">
                            {/* Meta Data */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-secondary-50/50 p-6 rounded-3xl border border-secondary-100">
                                <div className="space-y-2">
                                    <label className="text-xs font-black tracking-widest text-secondary-500 uppercase">Vendor *</label>
                                    <select required className="input-premium w-full" value={formData.vendorId} onChange={e => setFormData({...formData, vendorId: e.target.value})}>
                                        <option value="">Select Vendor...</option>
                                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black tracking-widest text-secondary-500 uppercase">PO Number (Optional)</label>
                                    <input type="text" placeholder="Auto-generated if empty" className="input-premium w-full" value={formData.poNumber} onChange={e => setFormData({...formData, poNumber: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black tracking-widest text-secondary-500 uppercase">Expected Delivery</label>
                                    <input type="date" className="input-premium w-full" value={formData.expectedDate} onChange={e => setFormData({...formData, expectedDate: e.target.value})} />
                                </div>
                            </div>
                            
                            {/* Line Items */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-secondary-900">Order Items</h3>
                                    <button type="button" onClick={addLineItem} className="text-primary-600 text-xs font-bold hover:text-primary-700 bg-primary-50 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                                        <Plus size={14} /> Add Line Item
                                    </button>
                                </div>
                                
                                <div className="space-y-3">
                                    {formData.items.map((item, index) => (
                                        <div key={index} className="flex flex-col md:flex-row gap-3 items-end bg-white p-4 rounded-2xl border border-secondary-200 shadow-sm relative group">
                                            <div className="flex-1 space-y-2 w-full">
                                                <label className="text-[10px] font-black tracking-widest text-secondary-500 uppercase">Item Description</label>
                                                <input required type="text" className="input-premium w-full bg-secondary-50 py-2.5 text-sm" placeholder="Dell XPS 15 / Office Chairs..." value={item.description} onChange={e => updateLineItem(index, 'description', e.target.value)} />
                                            </div>
                                            <div className="w-full md:w-32 space-y-2">
                                                <label className="text-[10px] font-black tracking-widest text-secondary-500 uppercase">Qty</label>
                                                <input required type="number" min="1" className="input-premium w-full bg-secondary-50 py-2.5 text-sm" value={item.quantity} onChange={e => updateLineItem(index, 'quantity', e.target.value)} />
                                            </div>
                                            <div className="w-full md:w-48 space-y-2">
                                                <label className="text-[10px] font-black tracking-widest text-secondary-500 uppercase">Unit Price (₹)</label>
                                                <input required type="number" min="0" step="0.01" className="input-premium w-full bg-secondary-50 py-2.5 text-sm" value={item.unitPrice} onChange={e => updateLineItem(index, 'unitPrice', e.target.value)} />
                                            </div>
                                            <div className="pb-[13px] md:pl-2">
                                                <button type="button" onClick={() => removeLineItem(index)} disabled={formData.items.length === 1} className="p-2.5 text-danger-500 bg-danger-50 hover:bg-danger-100 rounded-xl disabled:opacity-50 transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-8 border-t border-secondary-100 flex justify-end gap-3 sticky bottom-0 bg-white shadow-[0_-10px_20px_rgba(255,255,255,0.9)] pb-2 z-10">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="px-6 py-2.5 rounded-xl font-bold text-secondary-600 hover:bg-secondary-100 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-premium px-8 py-2.5 rounded-xl shadow-lg shadow-primary-500/20">
                                    Issue Order To Vendor
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
