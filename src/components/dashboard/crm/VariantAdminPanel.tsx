'use client';

import { useState } from 'react';
import { Layers, Plus, Tag, AlertCircle, Edit3, Trash2 } from 'lucide-react';

interface VariantAdminPanelProps {
    product: any;
    onRefresh: () => void;
    authH: HeadersInit;
}

export default function VariantAdminPanel({ product, onRefresh, authH }: VariantAdminPanelProps) {
    const [loading, setLoading] = useState(false);
    const [attributeForms, setAttributeForms] = useState<any[]>([]);
    
    // Attributes
    const [newAttrName, setNewAttrName] = useState('');
    const [newAttrValues, setNewAttrValues] = useState('');

    // Variants
    const [selectedVariants, setSelectedVariants] = useState<Set<string>>(new Set());
    const [bulkPrice, setBulkPrice] = useState<number | ''>('');
    const [bulkStock, setBulkStock] = useState<number | ''>('');

    if (product.type !== 'VARIABLE') return null;

    const handleAddAttribute = async () => {
        if (!newAttrName.trim() || !newAttrValues.trim()) return;
        setLoading(true);
        try {
            const values = newAttrValues.split(',').map(v => v.trim()).filter(Boolean);
            const res = await fetch(`/api/invoice-products/${product.id}/attributes`, {
                method: 'POST',
                headers: authH,
                body: JSON.stringify({ name: newAttrName, values })
            });
            if (res.ok) {
                setNewAttrName('');
                setNewAttrValues('');
                onRefresh();
            } else {
                alert('Failed to add attribute');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async (overwrite: boolean = false) => {
        if (!overwrite && product.variants?.length > 0) {
            if (!confirm('Variants already exist. Regenerating will reset configurations. Continue?')) {
                return;
            }
            overwrite = true;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/invoice-products/${product.id}/generate-variants`, {
                method: 'POST',
                headers: authH,
                body: JSON.stringify({ overwrite })
            });
            if (res.ok) {
                onRefresh();
            } else {
                const data = await res.json();
                alert('Failed to generate variants: ' + (data.error || 'Unknown error'));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkUpdate = async () => {
        if (selectedVariants.size === 0) return;
        const updates = Array.from(selectedVariants).map(id => ({
            id,
            ...(bulkPrice !== '' && { priceINR: Number(bulkPrice), priceUSD: Number(bulkPrice) / 83.5 }),
            ...(bulkStock !== '' && { stockQuantity: Number(bulkStock) })
        }));

        setLoading(true);
        try {
            const res = await fetch(`/api/invoice-products/${product.id}/variants/bulk`, {
                method: 'PATCH',
                headers: authH,
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                setSelectedVariants(new Set());
                setBulkPrice('');
                setBulkStock('');
                onRefresh();
            }
        } finally {
            setLoading(false);
        }
    };

    const updateVariant = async (variantId: string, data: any) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/invoice-products/${product.id}/variants/${variantId}`, {
                method: 'PATCH',
                headers: authH,
                body: JSON.stringify(data)
            });
            if (res.ok) onRefresh();
        } finally {
            setLoading(false);
        }
    };

    const toggleSelect = (id: string) => {
        const s = new Set(selectedVariants);
        if (s.has(id)) s.delete(id); else s.add(id);
        setSelectedVariants(s);
    };

    return (
        <div className="bg-secondary-950 p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden mt-8">
            <h3 className="text-white font-black text-lg uppercase tracking-widest mb-4">Variable Operations</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-400 mb-6">Define global operations for variants.</p>

            {/* Attributes Section */}
            <div className="mb-8">
                <h4 className="text-xs text-white font-bold uppercase mb-4">1. Define Attributes</h4>
                <div className="space-y-4">
                    {product.attributes?.map((attr: any) => (
                        <div key={attr.id} className="bg-white/10 p-4 rounded-xl flex flex-col gap-2">
                            <span className="text-sm font-black text-white">{attr.name}</span>
                            <div className="flex flex-wrap gap-2">
                                {attr.values?.map((v: any) => (
                                    <span key={v.id} className="bg-white/20 text-[10px] uppercase text-white px-2 py-1 rounded">
                                        {v.value}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                    <div className="flex gap-4 items-center">
                        <input className="input bg-white/5 border-white/10 text-white flex-1"
                            placeholder="Attribute (e.g. Size)" value={newAttrName} onChange={e => setNewAttrName(e.target.value)} />
                        <input className="input bg-white/5 border-white/10 text-white flex-[2]"
                            placeholder="Values (comma separated)" value={newAttrValues} onChange={e => setNewAttrValues(e.target.value)} />
                        <button type="button" onClick={handleAddAttribute} disabled={loading}
                            className="bg-primary-600 px-4 py-2 rounded-xl text-white font-black text-xs uppercase cursor-pointer">
                            Add Block
                        </button>
                    </div>
                </div>
            </div>

            {/* Generate Button */}
            <div className="border-t border-white/10 py-6">
                <button type="button" onClick={() => handleGenerate(false)} disabled={loading}
                    className="w-full py-4 bg-primary-600/20 border border-primary-500/50 hover:bg-primary-500/40 transition-colors text-primary-300 font-black tracking-widest rounded-2xl flex items-center justify-center gap-3">
                    <Layers size={18} /> {loading ? 'Generating...' : 'Permute & Generate Variants'}
                </button>
            </div>

            {/* Variants Table */}
            {product.variants?.length > 0 && (
                <div className="mt-4">
                    <h4 className="text-xs text-white font-bold uppercase mb-4 flex justify-between items-center">
                        2. Configure Generated Variants
                        <span className="bg-white/10 px-3 py-1 rounded text-primary-300">Total: {product.variants.length}</span>
                    </h4>

                    {selectedVariants.size > 0 && (
                        <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl mb-4 border border-primary-500/30">
                            <span className="text-xs text-white uppercase">{selectedVariants.size} selected for bulk:</span>
                            <input type="number" placeholder="Set Price (₹)" className="input bg-white/10 border-none text-white w-28 text-xs h-8" 
                                value={bulkPrice} onChange={e => setBulkPrice(Number(e.target.value) || '')} />
                            <input type="number" placeholder="Set Stock" className="input bg-white/10 border-none text-white w-28 text-xs h-8" 
                                value={bulkStock} onChange={e => setBulkStock(Number(e.target.value) || '')} />
                            <button type="button" onClick={handleBulkUpdate} className="bg-primary-600 text-white px-4 py-1.5 rounded text-[10px] font-black uppercase ml-auto">
                                Apply Bulk
                            </button>
                        </div>
                    )}

                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                        {product.variants.map((v: any) => (
                            <div key={v.id} className="flex gap-3 items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                <input type="checkbox" checked={selectedVariants.has(v.id)} onChange={() => toggleSelect(v.id)} className="w-4 h-4 cursor-pointer" />
                                <div className="text-[10px] font-mono text-primary-200 bg-black/40 px-2 py-1 rounded w-32 truncate" title={v.sku}>
                                    {v.sku || 'NO-SKU'}
                                </div>
                                <div className="flex-1 font-bold text-xs text-white flex gap-1 flex-wrap">
                                    {Object.entries(v.attributes).map(([k, val]) => (
                                        <span key={k} className="bg-white/10 px-2 py-0.5 rounded text-[9px] uppercase">{val as string}</span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input type="number" className="input bg-white/5 border-white/10 text-white text-xs w-24 h-8"
                                        placeholder="Price ₹" defaultValue={v.priceINR ?? ''}
                                        onBlur={e => updateVariant(v.id, { priceINR: Number(e.target.value) })}
                                    />
                                    <input type="number" className="input bg-white/5 border-white/10 text-white text-xs w-20 h-8"
                                        placeholder="Stock" defaultValue={v.stockQuantity ?? ''}
                                        onBlur={e => updateVariant(v.id, { stockQuantity: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
