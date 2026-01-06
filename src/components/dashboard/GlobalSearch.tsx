'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function GlobalSearch() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const router = useRouter();
    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Keyboard shortcut to open search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Handle search fetching
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length < 2) {
                setResults([]);
                return;
            }

            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setResults(data.results);
                    setSelectedIndex(0);
                }
            } catch (err) {
                console.error('Search error:', err);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (result: any) => {
        setIsOpen(false);
        setQuery('');
        router.push(result.href);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % Math.max(results.length, 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        } else if (e.key === 'Enter') {
            if (results[selectedIndex]) {
                handleSelect(results[selectedIndex]);
            }
        }
    };

    if (!isOpen) return (
        <button
            onClick={() => setIsOpen(true)}
            className="hidden md:flex items-center space-x-2 px-4 py-2 bg-secondary-50 border border-secondary-200 rounded-xl text-secondary-400 hover:bg-secondary-100 transition-all group"
        >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-sm font-medium">Quick search...</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-white border border-secondary-200 rounded shadow-sm text-secondary-500 group-hover:bg-secondary-50">
                ⌘ K
            </span>
        </button>
    );

    return (
        <div className="fixed inset-0 z-[100] bg-secondary-900/40 backdrop-blur-sm p-4 flex items-start justify-center pt-24 animate-in fade-in duration-200">
            <div
                ref={searchRef}
                className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-secondary-200 overflow-hidden animate-in slide-in-from-top-4 duration-300"
            >
                {/* Search Bar */}
                <div className="relative flex items-center border-b border-secondary-100 p-6">
                    <svg className={`h-6 w-6 mr-4 ${loading ? 'text-primary-500 animate-spin' : 'text-secondary-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {loading ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        )}
                    </svg>
                    <input
                        ref={inputRef}
                        type="text"
                        className="w-full text-xl font-bold text-secondary-900 placeholder-secondary-300 focus:outline-none"
                        placeholder="Search records, staff, journals..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-xs font-black text-secondary-400 uppercase tracking-widest hover:text-secondary-600 ml-4"
                    >
                        Esc
                    </button>
                </div>

                {/* Results Area */}
                <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
                    {results.length > 0 ? (
                        <div className="space-y-1">
                            {results.map((result, idx) => (
                                <button
                                    key={`${result.type}-${result.id}`}
                                    onClick={() => handleSelect(result)}
                                    className={`w-full flex items-center p-4 rounded-2xl transition-all text-left ${idx === selectedIndex ? 'bg-primary-50 border-primary-100 shadow-sm' : 'hover:bg-secondary-50'}`}
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm ${idx === selectedIndex ? 'bg-white' : 'bg-secondary-100'}`}>
                                        {result.icon}
                                    </div>
                                    <div className="ml-4 flex-1">
                                        <div className="flex justify-between items-center">
                                            <p className={`font-bold ${idx === selectedIndex ? 'text-primary-700' : 'text-secondary-900'}`}>{result.title}</p>
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider ${idx === selectedIndex ? 'bg-primary-200 text-primary-700' : 'bg-secondary-200 text-secondary-600'}`}>
                                                {result.type}
                                            </span>
                                        </div>
                                        <p className={`text-xs mt-0.5 ${idx === selectedIndex ? 'text-primary-600' : 'text-secondary-500'}`}>{result.subtitle}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : query.length >= 2 ? (
                        <div className="py-12 text-center text-secondary-500 italic">
                            No results found for &quot;{query}&quot;
                        </div>
                    ) : (
                        <div className="py-12 text-center">
                            <p className="text-secondary-400 text-sm font-medium">Type at least 2 characters to search across:</p>
                            <div className="flex flex-wrap justify-center gap-4 mt-6">
                                {['Customers', 'Invoices', 'Subscriptions', 'Staff', 'Journals'].map(tag => (
                                    <span key={tag} className="px-3 py-1 bg-secondary-50 border border-secondary-100 rounded-full text-[10px] font-black text-secondary-500 uppercase tracking-widest">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-secondary-50 p-4 flex justify-between items-center border-t border-secondary-100">
                    <div className="flex items-center space-x-6 text-[10px] font-black text-secondary-400 uppercase tracking-widest">
                        <span className="flex items-center"><span className="px-1.5 py-0.5 bg-white border rounded shadow-sm mr-2">↵</span> to select</span>
                        <span className="flex items-center"><span className="px-1.5 py-0.5 bg-white border rounded shadow-sm mr-2">↑↓</span> to navigate</span>
                    </div>
                    <div className="text-[10px] font-black text-secondary-300 uppercase tracking-widest">
                        STM Global Search v1.0
                    </div>
                </div>
            </div>
        </div>
    );
}
