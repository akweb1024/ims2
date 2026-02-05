"use client";

import { useState, useEffect } from "react";
import { X, DollarSign, Calendar, CreditCard, Tag, FileText, User, Landmark, Mail, Phone } from "lucide-react";

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingTransaction?: any;
}

export default function TransactionModal({ isOpen, onClose, onSuccess, editingTransaction }: TransactionModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        type: "EXPENSE",
        category: "",
        amount: "",
        currency: "INR",
        date: new Date().toISOString().split("T")[0],
        description: "",
        paymentMethod: "BANK_TRANSFER",
        referenceId: "",
        // Extended fields for Revenue
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        bankName: "",
        referenceNumber: ""
    });

    useEffect(() => {
        if (editingTransaction) {
            setFormData({
                type: editingTransaction.type || "EXPENSE",
                category: editingTransaction.category || "",
                amount: editingTransaction.amount?.toString() || "",
                currency: editingTransaction.currency || "INR",
                date: new Date(editingTransaction.date).toISOString().split("T")[0],
                description: editingTransaction.description || "",
                paymentMethod: editingTransaction.paymentMethod || "BANK_TRANSFER",
                referenceId: editingTransaction.referenceId || "",
                customerName: editingTransaction.customerName || "",
                customerEmail: editingTransaction.customerEmail || "",
                customerPhone: editingTransaction.customerPhone || "",
                bankName: editingTransaction.bankName || "",
                referenceNumber: editingTransaction.referenceId || ""
            });
        } else {
            setFormData({
                type: "EXPENSE",
                category: "",
                amount: "",
                currency: "INR",
                date: new Date().toISOString().split("T")[0],
                description: "",
                paymentMethod: "BANK_TRANSFER",
                referenceId: "",
                customerName: "",
                customerEmail: "",
                customerPhone: "",
                bankName: "",
                referenceNumber: ""
            });
        }
    }, [editingTransaction, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/finance" + (editingTransaction ? `?id=${editingTransaction.id}` : ""), {
                method: editingTransaction ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to save transaction");
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                {/* Header */}
                <div className="p-6 border-b border-secondary-100 flex justify-between items-center bg-secondary-50">
                    <div>
                        <h3 className="text-xl font-black text-secondary-900">
                            {editingTransaction ? "Edit Transaction" : "New Transaction"}
                        </h3>
                        <p className="text-xs text-secondary-500 font-medium">Record financial activity in your ledger</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-secondary-100 rounded-full transition-colors">
                        <X size={24} className="text-secondary-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-8 max-h-[75vh] overflow-y-auto custom-scrollbar space-y-8">
                        {/* Transaction Type Toggle */}
                        <div className="flex p-1.5 bg-secondary-100 rounded-2xl w-full max-w-xs mx-auto">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, type: "EXPENSE" })}
                                className={`flex-1 py-2 rounded-xl text-xs font-black uppercase transition-all ${formData.type === "EXPENSE" ? "bg-rose-500 text-white shadow-lg" : "text-secondary-500 hover:text-secondary-700"}`}
                            >
                                Expense
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, type: "REVENUE" })}
                                className={`flex-1 py-2 rounded-xl text-xs font-black uppercase transition-all ${formData.type === "REVENUE" ? "bg-emerald-500 text-white shadow-lg" : "text-secondary-500 hover:text-secondary-700"}`}
                            >
                                Revenue
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <section>
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-2">Category</label>
                                    <div className="relative">
                                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                                        <input
                                            type="text"
                                            required
                                            className="input-premium pl-10"
                                            placeholder="e.g. Rent, Salary, Service Fee"
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        />
                                    </div>
                                </section>

                                <section>
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-2">Amount (₹)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                                        <input
                                            type="number"
                                            required
                                            className="input-premium pl-10 text-lg font-black"
                                            placeholder="0.00"
                                            value={formData.amount}
                                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                        />
                                    </div>
                                </section>

                                <section>
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-2">Transaction Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                                        <input
                                            type="date"
                                            required
                                            className="input-premium pl-10"
                                            value={formData.date}
                                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        />
                                    </div>
                                </section>
                            </div>

                            {/* Secondary Info */}
                            <div className="space-y-4">
                                <section>
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-2">Payment Method</label>
                                    <div className="relative">
                                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                                        <select
                                            className="input-premium pl-10 appearance-none"
                                            value={formData.paymentMethod}
                                            onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                                        >
                                            <option value="BANK_TRANSFER">Bank Transfer</option>
                                            <option value="UPI">UPI / PhonePe / GPay</option>
                                            <option value="CASH">Cash</option>
                                            <option value="CHEQUE">Cheque</option>
                                            <option value="DD">Demand Draft</option>
                                            <option value="RAZORPAY">Razorpay</option>
                                            <option value="OTHER">Other</option>
                                        </select>
                                    </div>
                                </section>

                                <section>
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-1">
                                        {formData.type === "REVENUE" ? "Reference # (Required)" : "Reference # (Optional)"}
                                    </label>
                                    <div className="relative">
                                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                                        <input
                                            type="text"
                                            required={formData.type === "REVENUE"}
                                            className="input-premium pl-10 font-mono text-sm"
                                            placeholder="e.g. UTR / CHQ #"
                                            value={formData.type === "REVENUE" ? formData.referenceNumber : formData.referenceId}
                                            onChange={e => {
                                                if (formData.type === "REVENUE") setFormData({ ...formData, referenceNumber: e.target.value });
                                                else setFormData({ ...formData, referenceId: e.target.value });
                                            }}
                                        />
                                    </div>
                                </section>

                                <section>
                                    <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest block mb-2">Description</label>
                                    <textarea
                                        className="input-premium h-24 py-3 resize-none"
                                        placeholder="Add notes or details..."
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    ></textarea>
                                </section>
                            </div>
                        </div>

                        {/* Revenue Specific Fields */}
                        {formData.type === "REVENUE" && (
                            <div className="mt-8 p-6 bg-emerald-50 rounded-3xl border border-emerald-100 animate-in slide-in-from-top-4 duration-500">
                                <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <User size={14} />
                                    Customer Information
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <section>
                                        <label className="text-[10px] font-bold text-emerald-600 uppercase mb-1 block">Customer Name</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-300" size={14} />
                                            <input
                                                type="text"
                                                className="w-full bg-white pl-9 pr-4 py-2 rounded-xl text-sm border-emerald-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                                                value={formData.customerName}
                                                onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                                            />
                                        </div>
                                    </section>
                                    <section>
                                        <label className="text-[10px] font-bold text-emerald-600 uppercase mb-1 block">Bank Name</label>
                                        <div className="relative">
                                            <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-300" size={14} />
                                            <input
                                                type="text"
                                                className="w-full bg-white pl-9 pr-4 py-2 rounded-xl text-sm border-emerald-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                                                value={formData.bankName}
                                                onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                                            />
                                        </div>
                                    </section>
                                    <section>
                                        <label className="text-[10px] font-bold text-emerald-600 uppercase mb-1 block">Customer Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-300" size={14} />
                                            <input
                                                type="email"
                                                className="w-full bg-white pl-9 pr-4 py-2 rounded-xl text-sm border-emerald-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                                                value={formData.customerEmail}
                                                onChange={e => setFormData({ ...formData, customerEmail: e.target.value })}
                                            />
                                        </div>
                                    </section>
                                    <section>
                                        <label className="text-[10px] font-bold text-emerald-600 uppercase mb-1 block">Customer Phone</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-300" size={14} />
                                            <input
                                                type="text"
                                                className="w-full bg-white pl-9 pr-4 py-2 rounded-xl text-sm border-emerald-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                                                value={formData.customerPhone}
                                                onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                                            />
                                        </div>
                                    </section>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 bg-secondary-50 border-t border-secondary-100 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-sm font-bold text-secondary-500 hover:bg-secondary-100 rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`px-8 py-2.5 rounded-xl text-sm font-black text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 ${formData.type === "REVENUE" ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200" : "bg-primary-600 hover:bg-primary-700 shadow-primary-200"}`}
                        >
                            {loading ? "Processing..." : editingTransaction ? "Update Transaction" : "Save Transaction"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
