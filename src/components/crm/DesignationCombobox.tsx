'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, Loader2, Check, ChevronDown, X } from 'lucide-react';

interface Designation {
    id: string;
    name: string;
    level: number;
}

interface DesignationComboboxProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    error?: string;
}

interface DropdownPosition {
    top: number;
    left: number;
    width: number;
}

export default function DesignationCombobox({
    value,
    onChange,
    placeholder = 'Search or type a designation...',
    className = '',
    error,
}: DesignationComboboxProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState(value || '');
    const [options, setOptions] = useState<Designation[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [dropdownPos, setDropdownPos] = useState<DropdownPosition | null>(null);

    const triggerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync query when value changes externally
    useEffect(() => {
        if (value !== query) setQuery(value || '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    // Calculate fixed position from the trigger element
    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const dropdownHeight = 280; // max expected height
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;

        // Prefer opening downward; fall back to upward if not enough space
        const openUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

        setDropdownPos({
            top: openUp ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
            left: rect.left,
            width: rect.width,
        });
    }, []);

    const openDropdown = () => {
        updatePosition();
        setOpen(true);
    };

    // Recompute on scroll / resize while open
    useEffect(() => {
        if (!open) return;
        const update = () => updatePosition();
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    }, [open, updatePosition]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                triggerRef.current?.contains(target) ||
                dropdownRef.current?.contains(target)
            ) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Fetch options
    const fetchOptions = useCallback(async (search: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/crm/designations?search=${encodeURIComponent(search)}`);
            if (res.ok) {
                const data = await res.json();
                setOptions(data.data ?? []);
            }
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const t = setTimeout(() => fetchOptions(query), 250);
        return () => clearTimeout(t);
    }, [query, fetchOptions]);

    const handleSelect = (name: string) => {
        setQuery(name);
        onChange(name);
        setOpen(false);
    };

    const handleCreate = async () => {
        const trimmed = query.trim();
        if (!trimmed) return;
        setCreating(true);
        try {
            const res = await fetch('/api/crm/designations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: trimmed }),
            });
            if (res.ok) {
                onChange(trimmed);
                setOpen(false);
                fetchOptions(''); // refresh list
            }
        } catch {
            // silent
        } finally {
            setCreating(false);
        }
    };

    const handleClear = () => {
        setQuery('');
        onChange('');
        inputRef.current?.focus();
    };

    const exactMatch = options.some(o => o.name.toLowerCase() === query.trim().toLowerCase());
    const filtered = options.filter(o =>
        o.name.toLowerCase().includes(query.toLowerCase())
    );

    // Portal dropdown — renders outside all overflow-hidden parents
    const dropdown = open && dropdownPos ? createPortal(
        <div
            ref={dropdownRef}
            style={{
                position: 'fixed',
                top: dropdownPos.top,
                left: dropdownPos.left,
                width: dropdownPos.width,
                zIndex: 99999,
            }}
            className="bg-white border-2 border-secondary-200 rounded-2xl shadow-2xl overflow-hidden"
        >
            {loading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-secondary-400">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-xs font-semibold">Loading...</span>
                </div>
            ) : (
                <>
                    {filtered.length > 0 ? (
                        <ul className="max-h-60 overflow-y-auto py-1.5">
                            {filtered.map(opt => (
                                <li key={opt.id}>
                                    <button
                                        type="button"
                                        onMouseDown={e => e.preventDefault()} // keep focus on input
                                        className="w-full flex items-center justify-between px-4 py-2.5 text-left text-sm font-semibold text-secondary-800 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                                        onClick={() => handleSelect(opt.name)}
                                    >
                                        <span>{opt.name}</span>
                                        {opt.name.toLowerCase() === query.trim().toLowerCase() && (
                                            <Check size={13} className="text-primary-500 shrink-0" />
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="px-4 py-5 text-xs text-secondary-400 font-semibold text-center">
                            {query.trim() ? 'No matching designations found.' : 'Start typing to search...'}
                        </div>
                    )}

                    {/* Create new */}
                    {query.trim() && !exactMatch && (
                        <div className="border-t border-secondary-100">
                            <button
                                type="button"
                                onMouseDown={e => e.preventDefault()}
                                onClick={handleCreate}
                                disabled={creating}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-50"
                            >
                                {creating ? (
                                    <Loader2 size={13} className="animate-spin" />
                                ) : (
                                    <Plus size={13} />
                                )}
                                Create &ldquo;{query.trim()}&rdquo;
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>,
        document.body
    ) : null;

    return (
        <div className={`relative ${className}`}>
            {/* Trigger input */}
            <div
                ref={triggerRef}
                className={`flex items-center gap-2 w-full px-4 py-3 rounded-xl border-2 bg-white transition-all cursor-text
                    ${open ? 'border-primary-500 shadow-md shadow-primary-100' : 'border-secondary-200 hover:border-secondary-300'}
                    ${error ? '!border-red-400' : ''}
                `}
                onClick={() => { openDropdown(); inputRef.current?.focus(); }}
            >
                <Search size={14} className="text-secondary-400 shrink-0" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => {
                        setQuery(e.target.value);
                        onChange(e.target.value);
                        openDropdown();
                    }}
                    onFocus={openDropdown}
                    placeholder={placeholder}
                    className="flex-1 text-sm font-semibold text-secondary-900 placeholder:text-secondary-400 outline-none bg-transparent min-w-0"
                />
                {query && (
                    <button
                        type="button"
                        onClick={e => { e.stopPropagation(); handleClear(); }}
                        className="p-0.5 rounded text-secondary-400 hover:text-secondary-700 transition-colors shrink-0"
                    >
                        <X size={12} />
                    </button>
                )}
                <ChevronDown
                    size={14}
                    className={`text-secondary-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
            </div>

            {/* Portal dropdown */}
            {dropdown}

            {error && (
                <p className="mt-1 text-[10px] font-black text-red-500 uppercase tracking-wider">{error}</p>
            )}
        </div>
    );
}
