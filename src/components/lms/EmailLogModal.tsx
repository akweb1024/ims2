
'use client';

import { useState } from 'react';
import { X, Send } from 'lucide-react';
import toast from 'react-hot-toast';

interface EmailLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: any[];
    onSuccess: () => void;
}

export default function EmailLogModal({ isOpen, onClose, products, onSuccess }: EmailLogModalProps) {
    const [selectedProduct, setSelectedProduct] = useState('');
    const [count, setCount] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct || !count) return;

        setLoading(true);
        try {
            const product = products.find(p => p.id === selectedProduct);
            if (!product) return;

            const res = await fetch('/api/lms/email-log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: product.id,
                    type: product.type,
                    count: parseInt(count)
                })
            });

            if (res.ok) {
                toast.success('Emails logged successfully');
                onSuccess();
                onClose();
                setCount('');
                setSelectedProduct('');
            } else {
                toast.error('Failed to log emails');
            }
        } catch (error) {
            console.error(error);
            toast.error('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-secondary-900">Log Sent Emails</h3>
                    <button onClick={onClose} className="text-secondary-400 hover:text-secondary-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Select Product</label>
                        <select
                            className="input"
                            value={selectedProduct}
                            onChange={(e) => setSelectedProduct(e.target.value)}
                            required
                        >
                            <option value="">-- Choose Course/Workshop/Internship --</option>
                            {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.type}: {p.productName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="label">Email Count</label>
                        <input
                            type="number"
                            className="input"
                            placeholder="e.g. 5000"
                            value={count}
                            onChange={(e) => setCount(e.target.value)}
                            min="1"
                            required
                        />
                        <p className="text-xs text-secondary-500 mt-1">
                            This will increase the current count. Cost: 1 INR per 1000 emails.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={onClose} className="btn btn-ghost">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary flex items-center gap-2"
                            disabled={loading}
                        >
                            {loading ? 'Logging...' : <><Send size={18} /> Log Emails</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
