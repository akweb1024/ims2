'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import FormattedDate from '@/components/common/FormattedDate';
import { Search, Plus, FileText, ShoppingCart, Loader2, ArrowRight, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { getCustomerDisplayType } from '@/lib/customer-display';

export default function PurchaseOrdersPage() {
    const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
    const [customerOrders, setCustomerOrders] = useState<any[]>([]);
    const [proformaOrders, setProformaOrders] = useState<any[]>([]);
    const [vendors, setVendors] = useState<any[]>([]);
    const [couriers, setCouriers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'vendor' | 'customer'>('vendor');
    
    // Dispatch Management State
    const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [dispatchForm, setDispatchForm] = useState({
        recipientName: '',
        shippingAddress: '',
        shippingCity: '',
        shippingState: '',
        shippingPincode: '',
        shippingCountry: 'India',
        courierId: '',
        trackingNumber: '',
        weight: '1',
        status: 'PROCESSING',
        partnerName: ''
    });
    
    // View Items Modal State
    const [viewItemsModal, setViewItemsModal] = useState<{isOpen: boolean, title: string, items: any[]}>({
        isOpen: false, title: '', items: []
    });
    
    // Form state
    const [formData, setFormData] = useState({
        vendorId: '',
        poNumber: '',
        status: 'DRAFT',
        expectedDate: '',
        items: [{ description: '', quantity: 1, unitPrice: 0 }]
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [poRes, vendorRes, invoiceRes, couriersRes, proformaRes] = await Promise.all([
                fetch(`/api/supply-chain/purchase-orders?search=${encodeURIComponent(searchTerm)}&status=${filterStatus}`),
                fetch(`/api/supply-chain/vendors`),
                fetch(`/api/invoices?status=PAID&search=${encodeURIComponent(searchTerm)}`),
                fetch(`/api/logistics/couriers`),
                fetch(`/api/proforma?search=${encodeURIComponent(searchTerm)}`)
            ]);
            
            if (poRes.ok) setPurchaseOrders(await poRes.json());
            if (vendorRes.ok) {
                const vendorData = await vendorRes.json();
                setVendors(vendorData.filter((v:any) => v.status === 'ACTIVE'));
            }
            if (invoiceRes.ok) {
                const invData = await invoiceRes.json();
                setCustomerOrders(invData.data || []);
            }
            if (couriersRes.ok) setCouriers(await couriersRes.json());
            if (proformaRes.ok) {
                const pfData = await proformaRes.json();
                setProformaOrders(pfData.data || []);
            }
        } catch (err) {
            console.error('Fetch error:', err);
            toast.error('Network error');
        } finally {
            setLoading(false);
        }
    }, [searchTerm, filterStatus]);

    useEffect(() => {
        const timeout = setTimeout(loadData, 300);
        return () => clearTimeout(timeout);
    }, [loadData]);

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

    const handleGenerateDispatch = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const data = {
                ...dispatchForm,
                invoiceId: selectedInvoice.id,
                customerProfileId: selectedInvoice.customerProfileId || selectedInvoice.subscription?.customerProfileId,
                items: selectedInvoice.lineItems || [{ description: 'Auto-generated dispatch items', qty: 1 }],
                weight: parseFloat(dispatchForm.weight || '1'),
            };

            const res = await fetch('/api/logistics/orders', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                toast.success('Dispatch generated successfully!');
                setDispatchModalOpen(false);
                loadData();
            } else {
                toast.error('Failed to create dispatch');
            }
        } catch (err) {
            toast.error('Error generating dispatch');
        }
    };

    const handleUpdateDispatchStatus = async (dispatchId: string, status: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/logistics/orders/${dispatchId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                toast.success('Status updated');
                loadData();
            } else {
                toast.error('Failed to update status');
            }
        } catch (error) {
            toast.error('Error updating status');
        }
    };

    const openDispatchModal = (inv: any) => {
        setSelectedInvoice(inv);
        const name = inv.customerProfile?.name || inv.subscription?.customerProfile?.name || '';
        const org = inv.customerProfile?.organizationName || inv.subscription?.customerProfile?.organizationName || '';
        
        setDispatchForm({
            recipientName: org ? `${name} (${org})` : name,
            shippingAddress: inv.shippingAddress || '',
            shippingCity: inv.shippingCity || '',
            shippingState: inv.shippingState || '',
            shippingPincode: inv.shippingPincode || '',
            shippingCountry: inv.shippingCountry || 'India',
            courierId: '',
            trackingNumber: '',
            weight: '1',
            status: 'PROCESSING',
            partnerName: ''
        });
        setDispatchModalOpen(true);
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

                {/* Tabs */}
                <div className="flex bg-secondary-100 p-1 rounded-2xl w-fit">
                    <button
                        onClick={() => setActiveTab('vendor')}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all ${activeTab === 'vendor' ? 'bg-white shadow-sm text-primary-600' : 'text-secondary-500 hover:text-secondary-700'}`}
                    >
                        Vendor POs (To Buy)
                    </button>
                    <button
                        onClick={() => setActiveTab('customer')}
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all ${activeTab === 'customer' ? 'bg-white shadow-sm text-primary-600' : 'text-secondary-500 hover:text-secondary-700'}`}
                    >
                        Account Orders (To Ship)
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
                            className={`bg-secondary-50 rounded-2xl px-4 py-3 outline-none w-40 font-medium text-secondary-700 font-bold ${activeTab === 'customer' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            disabled={activeTab === 'customer'}
                        >
                            <option value="ALL">All Status</option>
                            <option value="DRAFT">DRAFT</option>
                            <option value="ISSUED">ISSUED</option>
                            <option value="PARTIAL">PARTIAL</option>
                            <option value="COMPLETED">COMPLETED</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-bold text-secondary-500 uppercase tracking-widest px-4">
                        <span>Total Records: {activeTab === 'vendor' ? (purchaseOrders.length + proformaOrders.length) : customerOrders.length}</span>
                    </div>
                </div>

                {/* Main Content Area */}
                {activeTab === 'vendor' ? (
                <div className="card-premium overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-secondary-50 border-b border-secondary-100 text-[10px] uppercase font-black tracking-widest text-secondary-500">
                                    <th className="px-6 py-4">PO Details</th>
                                    <th className="px-6 py-4">Vendor / Account</th>
                                    <th className="px-6 py-4">Total Amount</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Expected Date / Validity</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-50">
                                {loading ? (
                                    [1, 2, 3].map(i => <tr key={i} className="animate-pulse"><td colSpan={6} className="p-8 h-4"></td></tr>)
                                ) : (purchaseOrders.length === 0 && proformaOrders.length === 0) ? (
                                    <tr>
                                        <td colSpan={6} className="p-20 text-center text-secondary-400 font-bold italic">No Purchase or Proforma Orders found.</td>
                                    </tr>
                                ) : (
                                    <>
                                        {purchaseOrders.map(po => (
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
                                            <button 
                                                onClick={() => setViewItemsModal({isOpen: true, title: `PO: ${po.poNumber}`, items: po.items || []})}
                                                className="text-primary-600 font-bold text-xs hover:text-primary-700 p-2 bg-white shadow-sm border border-secondary-200 rounded-lg group-hover:shadow-md transition-all"
                                            >
                                                View Items ({po.items?.length || 0})
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {proformaOrders.map(pf => (
                                    <tr key={pf.id} className="hover:bg-primary-50/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-white border border-secondary-200 flex items-center justify-center shadow-sm">
                                                    <FileText size={18} className="text-secondary-400" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-secondary-900">
                                                        {pf.proformaNumber}
                                                        <span className="ml-2 px-1.5 py-0.5 rounded text-[8px] bg-slate-100 text-slate-700 font-bold uppercase border border-slate-200">Proforma</span>
                                                    </p>
                                                    <p className="text-[10px] text-secondary-400 font-mono tracking-widest font-bold">
                                                        <FormattedDate date={pf.createdAt} />
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold">
                                            <Link href={`/dashboard/customers/${pf.customerProfileId}`} className="text-primary-700 hover:text-primary-900 hover:underline">
                                                {pf.customerProfile?.organizationName || pf.customerProfile?.name || 'Unknown'} ({getCustomerDisplayType(pf.customerProfile)})
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm border border-secondary-200 w-max px-2.5 py-1 rounded-lg bg-green-50 text-green-700 font-bold tracking-tight">
                                                {pf.currency === 'INR' ? '₹' : '$'}{pf.total?.toLocaleString?.() || pf.total}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-lg font-black uppercase text-[10px] tracking-wider ${
                                                pf.status === 'DRAFT' ? 'bg-secondary-100 text-secondary-600' :
                                                pf.status === 'PAYMENT_PENDING' ? 'bg-amber-100 text-amber-700' :
                                                pf.status === 'CONVERTED' ? 'bg-emerald-100 text-emerald-700' :
                                                'bg-danger-100 text-danger-700'
                                            }`}>
                                                {pf.status?.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-semibold text-secondary-500">
                                            {pf.validUntil ? <FormattedDate date={pf.validUntil} /> : 'No Expiry Date'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => setViewItemsModal({isOpen: true, title: `Proforma: ${pf.proformaNumber}`, items: pf.lineItems || []})}
                                                className="text-primary-600 font-bold text-xs hover:text-primary-700 p-2 bg-white shadow-sm border border-secondary-200 rounded-lg group-hover:shadow-md transition-all"
                                            >
                                                View Items ({pf.lineItems?.length || 0})
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                ) : (
                <div className="card-premium overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-secondary-50 border-b border-secondary-100 text-[10px] uppercase font-black tracking-widest text-secondary-500">
                                    <th className="px-6 py-4">Invoice Details</th>
                                    <th className="px-6 py-4">Account</th>
                                    <th className="px-6 py-4">Total Amount</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Shipment Status</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-50">
                                {loading ? (
                                    [1, 2, 3].map(i => <tr key={i} className="animate-pulse"><td colSpan={6} className="p-8 h-4"></td></tr>)
                                ) : customerOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-20 text-center text-secondary-400 font-bold italic">No Paid Invoices found.</td>
                                    </tr>
                                ) : customerOrders.map((inv: any) => {
                                    const dispatchStatus = inv.dispatchOrders && inv.dispatchOrders.length > 0 ? inv.dispatchOrders[0].status : 'PENDING_CREATION';
                                    return (
                                    <tr key={inv.id} className="hover:bg-primary-50/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-white border border-secondary-200 flex items-center justify-center shadow-sm">
                                                    <FileText size={18} className="text-secondary-400" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-secondary-900">{inv.invoiceNumber}</p>
                                                    <p className="text-[10px] text-secondary-400 font-mono tracking-widest font-bold">
                                                        <FormattedDate date={inv.createdAt} />
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <p className="font-bold text-secondary-700">
                                                {inv.customerProfile?.name || inv.subscription?.customerProfile?.name || 'N/A'}
                                            </p>
                                            <p className="text-[10px] font-black uppercase tracking-widest mt-0.5 text-primary-600">
                                                {getCustomerDisplayType(inv.customerProfile || inv.subscription?.customerProfile)}
                                            </p>
                                            <p className="text-xs text-secondary-500">
                                                {inv.shippingCity}, {inv.shippingCountry}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm border border-secondary-200 w-max px-2.5 py-1 rounded-lg bg-green-50 text-green-700 font-bold tracking-tight">
                                                {inv.currency === 'INR' ? '₹' : '$'}{inv.total.toLocaleString()}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-lg font-black uppercase text-[10px] tracking-wider bg-emerald-100 text-emerald-700">
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-lg font-black uppercase text-[10px] tracking-wider ${
                                                dispatchStatus === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' :
                                                dispatchStatus === 'SHIPPED' ? 'bg-blue-100 text-blue-700' :
                                                dispatchStatus === 'PENDING_CREATION' ? 'bg-secondary-100 text-secondary-500' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                                {dispatchStatus.replace('_', ' ')}
                                            </span>
                                            {inv.dispatchOrders && inv.dispatchOrders.length > 0 && (
                                                <div className="mt-2 text-xs font-bold text-secondary-700">
                                                    Track: {inv.dispatchOrders[0].trackingNumber || 'N/A'}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {inv.dispatchOrders && inv.dispatchOrders.length > 0 ? (
                                                <div className="flex flex-col items-end gap-2">
                                                    <select 
                                                        className="text-xs font-bold border border-secondary-200 rounded-lg bg-white px-2 py-1 outline-none focus:border-primary-500"
                                                        value={inv.dispatchOrders[0].status}
                                                        onChange={(e) => handleUpdateDispatchStatus(inv.dispatchOrders[0].id, e.target.value)}
                                                    >
                                                        <option value="PROCESSING">Processing</option>
                                                        <option value="READY_TO_SHIP">Ready to Ship</option>
                                                        <option value="SHIPPED">Shipped</option>
                                                        <option value="IN_TRANSIT">In Transit</option>
                                                        <option value="DELIVERED">Delivered</option>
                                                    </select>
                                                </div>
                                            ) : (
                                                <button 
                                                    className="btn-premium py-1.5 px-3 text-xs w-full text-center"
                                                    onClick={() => openDispatchModal(inv)}
                                                >
                                                    Generate Shipment
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                </div>
                )}
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
            {/* Dispatch Order Modal */}
            {dispatchModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-secondary-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="px-8 py-6 border-b border-secondary-100 flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur z-10">
                            <div>
                                <h2 className="text-2xl font-black text-secondary-900">Create Shipment</h2>
                                <p className="text-sm font-medium text-secondary-500">Invoice {selectedInvoice.invoiceNumber}</p>
                            </div>
                            <button onClick={() => setDispatchModalOpen(false)} className="text-3xl text-secondary-300 hover:text-secondary-900">&times;</button>
                        </div>
                        <form onSubmit={handleGenerateDispatch} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Recipient Name</label>
                                    <input required className="input" value={dispatchForm.recipientName} onChange={e => setDispatchForm({...dispatchForm, recipientName: e.target.value})} />
                                </div>
                                <div>
                                    <label className="label">Weight (kg)</label>
                                    <input required type="number" step="0.1" className="input" value={dispatchForm.weight} onChange={e => setDispatchForm({...dispatchForm, weight: e.target.value})} />
                                </div>
                                <div className="col-span-1 md:col-span-2 p-4 bg-secondary-50 py-3 rounded-lg flex flex-col gap-3">
                                   <label className="label">Shipping Address</label>
                                   <textarea required rows={2} className="input" value={dispatchForm.shippingAddress} onChange={e => setDispatchForm({...dispatchForm, shippingAddress: e.target.value})} />
                                   <div className="grid grid-cols-2 gap-3">
                                       <input required placeholder="City" className="input py-2" value={dispatchForm.shippingCity} onChange={e => setDispatchForm({...dispatchForm, shippingCity: e.target.value})} />
                                       <input required placeholder="State" className="input py-2" value={dispatchForm.shippingState} onChange={e => setDispatchForm({...dispatchForm, shippingState: e.target.value})} />
                                       <input required placeholder="Pincode" className="input py-2" value={dispatchForm.shippingPincode} onChange={e => setDispatchForm({...dispatchForm, shippingPincode: e.target.value})} />
                                       <input required placeholder="Country" className="input py-2" value={dispatchForm.shippingCountry} onChange={e => setDispatchForm({...dispatchForm, shippingCountry: e.target.value})} />
                                   </div>
                                </div>
                                <div>
                                    <label className="label">Courier</label>
                                    <select className="input" value={dispatchForm.courierId} onChange={e => setDispatchForm({...dispatchForm, courierId: e.target.value})}>
                                        <option value="">Select Carrier...</option>
                                        {couriers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Tracking Number</label>
                                    <input className="input" value={dispatchForm.trackingNumber} onChange={e => setDispatchForm({...dispatchForm, trackingNumber: e.target.value})} />
                                </div>
                                <div>
                                    <label className="label">Carrier Partner Name (Optional)</label>
                                    <input className="input" value={dispatchForm.partnerName} onChange={e => setDispatchForm({...dispatchForm, partnerName: e.target.value})} />
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setDispatchModalOpen(false)} className="btn btn-secondary py-2.5">Cancel</button>
                                <button type="submit" className="btn-premium px-6 py-2.5 shadow-lg">Confirm Dispatch</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* View Items Modal */}
            {viewItemsModal.isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-secondary-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
                        <div className="px-8 py-6 border-b border-secondary-100 flex justify-between items-center bg-white/90 backdrop-blur shrink-0 rounded-t-[2rem]">
                            <h2 className="text-2xl font-black text-secondary-900">{viewItemsModal.title}</h2>
                            <button onClick={() => setViewItemsModal({isOpen: false, title: '', items: []})} className="text-3xl text-secondary-300 hover:text-secondary-900">&times;</button>
                        </div>
                        <div className="p-8 overflow-y-auto space-y-4 bg-secondary-50/30">
                            {viewItemsModal.items.length === 0 ? (
                                <p className="text-center text-sm font-bold text-secondary-400 italic">No items associated with this document.</p>
                            ) : (
                                <div className="space-y-3">
                                    {viewItemsModal.items.map((item, idx) => (
                                        <div key={idx} className="bg-white p-4 rounded-xl border border-secondary-100 shadow-sm flex flex-col gap-2">
                                            <div className="flex justify-between items-start gap-4">
                                                <span className="text-base font-bold text-secondary-800">{item.description || item.name || 'Unknown Item'}</span>
                                            </div>
                                            <div className="flex justify-between items-center mt-2 border-t border-secondary-50 pt-2">
                                                <span className="text-xs font-black text-secondary-400 tracking-wider">QTY: {item.quantity || item.qty || 1}</span>
                                                <span className="text-sm font-black text-green-700 bg-green-50 px-2 py-1 rounded-lg">
                                                    {(item.unitPrice || item.price || item.total || 0).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
