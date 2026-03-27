'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';

type ViewType = 'OVERVIEW' | 'ORDERS' | 'COURIERS';

export default function LogisticsPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [couriers, setCouriers] = useState<any[]>([]);
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isCreatingOrder, setIsCreatingOrder] = useState(false);
    const [view, setView] = useState<ViewType>('OVERVIEW');
    const [userRole, setUserRole] = useState<string>('');
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [courierFilter, setCourierFilter] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [isDetailSaving, setIsDetailSaving] = useState(false);
    const [detailForm, setDetailForm] = useState({
        recipientName: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        phone: '',
        courierId: '',
        partnerName: '',
        trackingNumber: '',
        weight: '',
        status: 'PENDING',
        remarks: '',
    });

    const fetchData = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            params.set('limit', '100');
            if (query.trim()) params.set('q', query.trim());
            if (statusFilter) params.set('status', statusFilter);
            if (courierFilter) params.set('courierId', courierFilter);

            const res = await fetch(`/api/logistics/orders?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setOrders(data.orders || []);
                setAnalytics({
                    stats: data.stats || {},
                    carrierPerformance: data.carrierPerformance || [],
                    trends: data.trends || []
                });
            }
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    }, [courierFilter, query, statusFilter]);

    const fetchCouriers = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/logistics/couriers', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setCouriers(await res.json());
        } catch (error) { console.error(error); }
    }, []);

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchData();
        fetchCouriers();
    }, [fetchData, fetchCouriers]);

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data: any = Object.fromEntries(formData);
        data.weight = data.weight ? parseFloat(data.weight) : undefined;
        if (!data.invoiceId) delete data.invoiceId;
        if (!data.courierId) delete data.courierId;
        if (!data.partnerName) delete data.partnerName;
        if (!data.trackingNumber) delete data.trackingNumber;
        if (!data.remarks) delete data.remarks;
        data.items = { description: 'Dispatch generated from logistics dashboard', qty: 1 };

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/logistics/orders', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                setIsCreatingOrder(false);
                fetchData();
            } else {
                alert('Failed to create order');
            }
        } catch (error) { console.error(error); }
    };

    const handleStatusUpdate = async (id: string, status: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/logistics/orders/${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });
            if (res.ok) fetchData();
        } catch (error) { console.error(error); }
    };

    const handleTrack = (order: any) => {
        if (!order?.tracking?.trackingUrl) return;
        window.open(order.tracking.trackingUrl, '_blank', 'noopener,noreferrer');
    };

    const syncDetailForm = (order: any) => {
        setDetailForm({
            recipientName: order?.recipientName || '',
            address: order?.address || '',
            city: order?.city || '',
            state: order?.state || '',
            pincode: order?.pincode || '',
            country: order?.country || 'India',
            phone: order?.phone || '',
            courierId: order?.courierId || '',
            partnerName: order?.partnerName || order?.courier?.name || '',
            trackingNumber: order?.trackingNumber || '',
            weight: order?.weight?.toString?.() || '',
            status: order?.status || 'PENDING',
            remarks: order?.remarks || '',
        });
    };

    const openOrderDetail = async (id: string) => {
        setIsOrderDetailOpen(true);
        setIsDetailLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/logistics/orders/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                throw new Error('Failed to load dispatch details');
            }
            const order = await res.json();
            setSelectedOrder(order);
            syncDetailForm(order);
        } catch (error: any) {
            alert(error.message || 'Failed to load dispatch details');
            setIsOrderDetailOpen(false);
            setSelectedOrder(null);
        } finally {
            setIsDetailLoading(false);
        }
    };

    const closeOrderDetail = () => {
        setIsOrderDetailOpen(false);
        setSelectedOrder(null);
    };

    const handleDetailSave = async () => {
        if (!selectedOrder?.id) return;
        setIsDetailSaving(true);
        try {
            const token = localStorage.getItem('token');
            const payload = {
                ...detailForm,
                weight: detailForm.weight.trim() ? Number(detailForm.weight) : null,
            };
            const res = await fetch(`/api/logistics/orders/${selectedOrder.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to update dispatch');
            }
            setSelectedOrder(data);
            syncDetailForm(data);
            fetchData();
            alert('Dispatch updated successfully');
        } catch (error: any) {
            alert(error.message || 'Failed to update dispatch');
        } finally {
            setIsDetailSaving(false);
        }
    };

    const handleAddCourier = async () => {
        const name = prompt("Courier Name:");
        if (!name) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/logistics/couriers', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name })
            });
            if (res.ok) fetchCouriers();
        } catch (error) { console.error(error); }
    };

    if (loading) return <div className="p-8 text-center text-secondary-500">Initializing Logistics Dashboard...</div>;

    const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900 tracking-tighter">Smart Logistics</h1>
                        <p className="text-secondary-500 font-medium">Predictive dispatch tracking and carrier performance intelligence.</p>
                    </div>
                    <div className="flex bg-secondary-100 p-1 rounded-2xl">
                        {(['OVERVIEW', 'ORDERS', 'COURIERS'] as ViewType[]).map((t) => (
                            <button
                                key={t}
                                onClick={() => setView(t)}
                                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${view === t ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {view === 'OVERVIEW' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="card-premium bg-gradient-to-br from-primary-600 to-primary-800 text-white border-0 shadow-xl shadow-primary-900/20">
                                <h3 className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Total Dispatches</h3>
                                <p className="text-3xl font-black">{orders.length}</p>
                                <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-white/80">
                                    <span className="bg-white/20 px-2 py-0.5 rounded-full">Active Month</span>
                                </div>
                            </div>
                            <div className="card-premium">
                                <h3 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">In Transit</h3>
                                <p className="text-3xl font-black text-secondary-900">{analytics?.stats?.IN_TRANSIT || 0}</p>
                                <p className="text-[10px] text-primary-600 mt-4 font-black uppercase tracking-widest">Active Shipments</p>
                            </div>
                            <div className="card-premium">
                                <h3 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Delivered</h3>
                                <p className="text-3xl font-black text-success-600">{analytics?.stats?.DELIVERED || 0}</p>
                                <p className="text-[10px] text-secondary-500 mt-4 font-black uppercase tracking-widest">Successful Completion</p>
                            </div>
                            <div className="card-premium">
                                <h3 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1">Returns / Lost</h3>
                                <p className="text-3xl font-black text-danger-600">{(analytics?.stats?.RETURNED || 0) + (analytics?.stats?.LOST || 0)}</p>
                                <p className="text-[10px] text-secondary-500 mt-4 font-black uppercase tracking-widest">Exception Rate: {orders.length > 0 ? (((analytics?.stats?.RETURNED || 0 + analytics?.stats?.LOST || 0) / orders.length) * 100).toFixed(1) : 0}%</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Shipment Trends */}
                            <div className="lg:col-span-2 card-premium p-8">
                                <h2 className="text-xl font-black text-secondary-900 mb-8">Shipment Velocity</h2>
                                <div className="h-80 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={analytics?.trends}>
                                            <defs>
                                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                                            <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Carrier Scorecard */}
                            <div className="card-premium p-8">
                                <h2 className="text-xl font-black text-secondary-900 mb-8">Carrier Scorecard</h2>
                                <div className="h-80 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analytics?.carrierPerformance} layout="vertical" margin={{ left: -20 }}>
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="courierName" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#1e293b' }} width={100} />
                                            <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                            <Bar dataKey="orderCount" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={20}>
                                                {analytics?.carrierPerformance?.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'ORDERS' && (
                    <div className="animate-fade-in space-y-4">
                        <div className="flex justify-end">
                            <button
                                onClick={() => setIsCreatingOrder(true)}
                                className="btn btn-primary flex items-center gap-2"
                            >
                                <span>+</span> New Shipment
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="input md:col-span-2"
                                placeholder="Search by invoice, customer, tracking, partner..."
                            />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="input"
                            >
                                <option value="">All statuses</option>
                                <option value="PENDING">Pending</option>
                                <option value="PROCESSING">Processing</option>
                                <option value="READY_TO_SHIP">Ready to Ship</option>
                                <option value="SHIPPED">Shipped</option>
                                <option value="IN_TRANSIT">In Transit</option>
                                <option value="DELIVERED">Delivered</option>
                                <option value="RETURNED">Returned</option>
                                <option value="LOST">Lost</option>
                            </select>
                            <select
                                value={courierFilter}
                                onChange={(e) => setCourierFilter(e.target.value)}
                                className="input"
                            >
                                <option value="">All partners</option>
                                {couriers.map((courier) => (
                                    <option key={courier.id} value={courier.id}>
                                        {courier.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="card-premium p-0 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-secondary-600">
                                    <thead className="bg-secondary-50 text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Invoice</th>
                                            <th className="px-6 py-4">Cycle / Destination</th>
                                            <th className="px-6 py-4">Courier / Tracking</th>
                                            <th className="px-6 py-4">Shipment Weights</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Last Updated</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-secondary-100">
                                        {orders.map(order => (
                                            <tr key={order.id} className="hover:bg-secondary-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    {order.invoice ? (
                                                        <div className="space-y-1">
                                                            <p className="font-bold text-secondary-900">{order.invoice.invoiceNumber}</p>
                                                            <p className="text-[10px] text-secondary-500 font-semibold uppercase tracking-widest">
                                                                {order.fulfillmentType === 'DIGITAL' ? 'Digital Access' : (order.cycleLabel || `Cycle ${order.cycleNumber}/${order.totalCycles}`)}
                                                            </p>
                                                            <p className="text-[10px] text-secondary-400 font-medium">
                                                                {order.invoice.currency === 'INR' ? '₹' : '$'}{order.invoice.total?.toLocaleString?.() || order.invoice.total}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-secondary-400">Manual</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-secondary-900">{order.recipientName}</p>
                                                    <p className="text-[10px] text-secondary-400 font-medium">
                                                        {order.customerProfile?.organizationName || order.customerProfile?.primaryEmail || [order.city, order.country].filter(Boolean).join(', ') || 'Address pending'}
                                                    </p>
                                                    <p className="text-[10px] text-secondary-500 font-medium">
                                                        Planned: {order.plannedDispatchDate ? new Date(order.plannedDispatchDate).toLocaleDateString() : 'Not scheduled'}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-secondary-800 text-xs">{order.fulfillmentType === 'DIGITAL' ? 'Digital Access' : order.tracking?.partnerName || order.courier?.name || 'Unassigned'}</p>
                                                    <p className="text-[10px] text-primary-600 font-black tracking-widest uppercase">{order.fulfillmentType === 'DIGITAL' ? 'ACCESS WINDOW' : order.tracking?.trackingNumber || 'PENDING ASSIGNMENT'}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-black text-secondary-900">{order.fulfillmentType === 'DIGITAL' ? '--' : (order.weight || '--')} {order.fulfillmentType === 'DIGITAL' ? '' : 'kg'}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(userRole) ? (
                                                        <select
                                                            value={order.status}
                                                            onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                                                            className="bg-transparent text-[10px] font-black uppercase text-primary-600 cursor-pointer hover:underline outline-none"
                                                        >
                                                            <option value="PENDING">Pending</option>
                                                            <option value="PROCESSING">Processing</option>
                                                            <option value="READY_TO_SHIP">Ready to Ship</option>
                                                            <option value="SHIPPED">Shipped</option>
                                                            <option value="IN_TRANSIT">In Transit</option>
                                                            <option value="DELIVERED">Delivered</option>
                                                            <option value="RETURNED">Returned</option>
                                                            <option value="LOST">Lost</option>
                                                        </select>
                                                    ) : (
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${order.status === 'DELIVERED' ? 'bg-success-100 text-success-700' : 'bg-secondary-100 text-secondary-700'}`}>
                                                            {order.status}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-[10px] font-bold text-secondary-400">
                                                    {new Date(order.updatedAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {order.invoice?.id && (
                                                            <Link
                                                                href={`/dashboard/crm/invoices/${order.invoice.id}`}
                                                                className="btn btn-secondary py-1 text-xs"
                                                            >
                                                                Invoice
                                                            </Link>
                                                        )}
                                                        <button
                                                            onClick={() => openOrderDetail(order.id)}
                                                            className="btn btn-secondary py-1 text-xs"
                                                        >
                                                            Manage
                                                        </button>
                                                        <button
                                                            onClick={() => handleTrack(order)}
                                                            disabled={order.fulfillmentType === 'DIGITAL' || !order.tracking?.canTrack}
                                                            className="btn btn-primary py-1 text-xs disabled:opacity-50"
                                                        >
                                                            {order.fulfillmentType === 'DIGITAL' ? 'Access' : 'Track'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'COURIERS' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-end">
                            <button onClick={handleAddCourier} className="btn btn-primary flex items-center gap-2">
                                <span>+</span> Add Courier Partner
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {couriers.map(courier => (
                                <div key={courier.id} className="card-premium p-8 flex flex-col items-center text-center group hover:border-primary-300 transition-all">
                                    <div className="p-4 bg-secondary-100 rounded-[2rem] mb-4 text-3xl group-hover:scale-110 transition-transform">🚚</div>
                                    <h3 className="text-lg font-black text-secondary-900 leading-tight">{courier.name}</h3>
                                    <p className="text-[10px] text-secondary-400 font-bold uppercase tracking-[0.2em] mt-2">Certified Partner</p>
                                    <div className="mt-6 pt-6 border-t border-secondary-50 w-full flex justify-between text-[10px] font-black uppercase tracking-widest">
                                        <span className="text-secondary-400">Operational Status</span>
                                        <span className="text-success-600 flex items-center gap-1.5 align-middle">
                                            <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse"></span>
                                            Active
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Create Order Modal */}
                {isCreatingOrder && (
                    <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
                            <button onClick={() => setIsCreatingOrder(false)} className="absolute top-6 right-8 text-2xl text-secondary-300 hover:text-secondary-900 transition-colors">×</button>
                            <h3 className="text-2xl font-black text-secondary-900 mb-6">Dispatch Origin</h3>
                            <form onSubmit={handleCreateOrder} className="space-y-4">
                                <div>
                                    <label className="label">Invoice ID (Optional)</label>
                                    <input name="invoiceId" className="input" placeholder="Paste invoice UUID to create invoice-linked dispatch" />
                                </div>
                                <div>
                                    <label className="label">Recipient Identity</label>
                                    <input name="recipientName" className="input" required placeholder="Full Name / Org" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="label">Destination Address</label>
                                        <textarea name="address" className="input" required rows={2} placeholder="Street details..." />
                                    </div>
                                    <div>
                                        <label className="label">City</label>
                                        <input name="city" className="input" required />
                                    </div>
                                    <div>
                                        <label className="label">Zip/Pincode</label>
                                        <input name="pincode" className="input" required />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="label">Country</label>
                                        <input name="country" className="input" required defaultValue="India" />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Assign Carrier</label>
                                    <select name="courierId" className="input">
                                        <option value="">Choose Partner...</option>
                                        {couriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Partner Name (Optional)</label>
                                    <input name="partnerName" className="input" placeholder="Use when courier is Other / custom partner" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Tracking / AWB Number</label>
                                        <input name="trackingNumber" className="input" placeholder="Serial / AWB number" />
                                    </div>
                                    <div>
                                        <label className="label">Weight (kg)</label>
                                        <input name="weight" type="number" step="0.01" className="input" placeholder="0.00" />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Remarks</label>
                                    <textarea name="remarks" className="input" rows={2} placeholder="Packing notes, handover notes, exceptions..." />
                                </div>
                                <div className="flex gap-2 pt-6">
                                    <button type="submit" className="btn btn-primary flex-1 py-4 font-black uppercase text-xs tracking-widest">Generate Shipment</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {isOrderDetailOpen && (
                    <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2rem] p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
                            <button onClick={closeOrderDetail} className="absolute top-5 right-6 text-2xl text-secondary-300 hover:text-secondary-900 transition-colors">×</button>
                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between mb-6">
                                <div>
                                    <h3 className="text-2xl font-black text-secondary-900">Dispatch Control Center</h3>
                                    <p className="text-sm text-secondary-500">
                                        Review shipment details, courier assignment, tracking, and destination in one place.
                                    </p>
                                </div>
                                {selectedOrder?.invoice?.id && (
                                    <Link href={`/dashboard/crm/invoices/${selectedOrder.invoice.id}`} className="btn btn-secondary text-xs py-2">
                                        Open Invoice
                                    </Link>
                                )}
                            </div>

                            {isDetailLoading ? (
                                <div className="py-16 text-center text-secondary-500">Loading dispatch details...</div>
                            ) : selectedOrder ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="rounded-2xl border border-secondary-100 bg-secondary-50 p-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-secondary-400">Invoice</p>
                                            <p className="mt-2 font-semibold text-secondary-900">
                                                {selectedOrder.invoice?.invoiceNumber || 'Manual dispatch'}
                                            </p>
                                            <p className="mt-1 text-sm text-secondary-600">
                                                {selectedOrder.invoice?.total ? `${selectedOrder.invoice.currency === 'INR' ? '₹' : '$'}${selectedOrder.invoice.total}` : 'No invoice total'}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-secondary-100 bg-secondary-50 p-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-secondary-400">Customer</p>
                                            <p className="mt-2 font-semibold text-secondary-900">
                                                {selectedOrder.customerProfile?.organizationName || selectedOrder.customerProfile?.name || selectedOrder.recipientName}
                                            </p>
                                            <p className="mt-1 text-sm text-secondary-600">
                                                {selectedOrder.customerProfile?.primaryEmail || selectedOrder.phone || 'No email'}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-secondary-100 bg-secondary-50 p-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-secondary-400">Cycle</p>
                                            <p className="mt-2 font-semibold text-secondary-900">
                                                {selectedOrder.fulfillmentType === 'DIGITAL'
                                                    ? 'Digital Access'
                                                    : (selectedOrder.cycleLabel || `Cycle ${selectedOrder.cycleNumber}/${selectedOrder.totalCycles}`)}
                                            </p>
                                            <p className="mt-1 text-sm text-secondary-600">
                                                {selectedOrder.plannedDispatchDate
                                                    ? `Planned ${new Date(selectedOrder.plannedDispatchDate).toLocaleDateString()}`
                                                    : 'No planned date'}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-secondary-100 bg-secondary-50 p-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-secondary-400">Status</p>
                                            <p className="mt-2 font-semibold text-secondary-900">
                                                {selectedOrder.status.replace(/_/g, ' ')}
                                            </p>
                                            <p className="mt-1 text-sm text-secondary-600">
                                                Updated {new Date(selectedOrder.updatedAt).toLocaleDateString()}
                                            </p>
                                            {selectedOrder.fulfillmentType === 'DIGITAL' && (
                                                <p className="mt-1 text-sm text-secondary-600">
                                                    Access: {selectedOrder.accessStartDate ? new Date(selectedOrder.accessStartDate).toLocaleDateString() : '—'} to {selectedOrder.accessEndDate ? new Date(selectedOrder.accessEndDate).toLocaleDateString() : '—'}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="label">Recipient</label>
                                            <input
                                                className="input"
                                                value={detailForm.recipientName}
                                                onChange={(e) => setDetailForm((prev) => ({ ...prev, recipientName: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Phone</label>
                                            <input
                                                className="input"
                                                value={detailForm.phone}
                                                onChange={(e) => setDetailForm((prev) => ({ ...prev, phone: e.target.value }))}
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="label">Address</label>
                                            <textarea
                                                className="input"
                                                rows={2}
                                                value={detailForm.address}
                                                onChange={(e) => setDetailForm((prev) => ({ ...prev, address: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">City</label>
                                            <input
                                                className="input"
                                                value={detailForm.city}
                                                onChange={(e) => setDetailForm((prev) => ({ ...prev, city: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">State</label>
                                            <input
                                                className="input"
                                                value={detailForm.state}
                                                onChange={(e) => setDetailForm((prev) => ({ ...prev, state: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Pincode</label>
                                            <input
                                                className="input"
                                                value={detailForm.pincode}
                                                onChange={(e) => setDetailForm((prev) => ({ ...prev, pincode: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Country</label>
                                            <input
                                                className="input"
                                                value={detailForm.country}
                                                onChange={(e) => setDetailForm((prev) => ({ ...prev, country: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Courier Partner</label>
                                            <select
                                                className="input"
                                                value={detailForm.courierId}
                                                onChange={(e) => setDetailForm((prev) => ({ ...prev, courierId: e.target.value }))}
                                            >
                                                <option value="">Select courier</option>
                                                {couriers.map((courier) => (
                                                    <option key={courier.id} value={courier.id}>
                                                        {courier.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label">Partner Name</label>
                                            <input
                                                className="input"
                                                value={detailForm.partnerName}
                                                onChange={(e) => setDetailForm((prev) => ({ ...prev, partnerName: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Tracking / AWB Number</label>
                                            <input
                                                className="input"
                                                value={detailForm.trackingNumber}
                                                onChange={(e) => setDetailForm((prev) => ({ ...prev, trackingNumber: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Weight (kg)</label>
                                            <input
                                                className="input"
                                                type="number"
                                                step="0.01"
                                                value={detailForm.weight}
                                                onChange={(e) => setDetailForm((prev) => ({ ...prev, weight: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="label">Status</label>
                                            <select
                                                className="input"
                                                value={detailForm.status}
                                                onChange={(e) => setDetailForm((prev) => ({ ...prev, status: e.target.value }))}
                                            >
                                                <option value="PENDING">Pending</option>
                                                <option value="PROCESSING">Processing</option>
                                                <option value="READY_TO_SHIP">Ready to Ship</option>
                                                <option value="SHIPPED">Shipped</option>
                                                <option value="IN_TRANSIT">In Transit</option>
                                                <option value="DELIVERED">Delivered</option>
                                                <option value="RETURNED">Returned</option>
                                                <option value="LOST">Lost</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="label">Remarks</label>
                                            <textarea
                                                className="input"
                                                rows={3}
                                                value={detailForm.remarks}
                                                onChange={(e) => setDetailForm((prev) => ({ ...prev, remarks: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 && (
                                        <div className="rounded-2xl border border-secondary-100 bg-secondary-50 p-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-secondary-400">Dispatch Items</p>
                                            <div className="mt-3 space-y-2">
                                                {selectedOrder.items.map((item: any, index: number) => (
                                                    <div key={`${item.name || 'item'}-${index}`} className="flex items-start justify-between gap-4 text-sm">
                                                        <div>
                                                            <p className="font-semibold text-secondary-900">{item.name || item.description || `Item ${index + 1}`}</p>
                                                            {item.price && (
                                                                <p className="text-secondary-500">Value: {item.price}</p>
                                                            )}
                                                        </div>
                                                        <span className="text-secondary-500">Qty: {item.qty || item.quantity || 1}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap justify-end gap-2">
                                        {selectedOrder.tracking?.canTrack && (
                                            <button onClick={() => handleTrack(selectedOrder)} className="btn btn-secondary py-2 text-xs">
                                                Open Tracking
                                            </button>
                                        )}
                                        {selectedOrder.customerProfile?.id && (
                                            <Link href={`/dashboard/customers/${selectedOrder.customerProfile.id}`} className="btn btn-secondary py-2 text-xs">
                                                Open Customer
                                            </Link>
                                        )}
                                        <button onClick={handleDetailSave} disabled={isDetailSaving} className="btn btn-primary py-2 text-xs">
                                            {isDetailSaving ? 'Saving...' : 'Save Dispatch'}
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
