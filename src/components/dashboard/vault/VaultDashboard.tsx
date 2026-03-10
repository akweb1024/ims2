"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useVault } from './VaultContext';
import { decryptItemKeyWithRSA, decryptItemPayload } from '@/lib/crypto-vault';
import { Search, Plus, Folder as FolderIcon, KeyRound, Copy, Check, ShieldAlert, Star, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import AddItemModal from './AddItemModal';
import ShareItemModal from './ShareItemModal';

interface VaultItemRaw {
    id: string;
    type: string;
    title: string;
    username: string;
    website: string;
    icon: string;
    myEncryptedKey: string;
    encryptedData: string;
    iv: string;
    isFavorite: boolean;
    isShared: boolean;
    canEdit: boolean;
    folder?: { name: string; color: string; icon: string };
    createdAt: string;
    updatedAt: string;
}

interface VaultItemDecrypted extends VaultItemRaw {
    payload: any;
}

export default function VaultDashboard() {
    const { privateKey, isUnlocked } = useVault();
    const [rawItems, setRawItems] = useState<VaultItemRaw[]>([]);
    const [decryptedItems, setDecryptedItems] = useState<VaultItemDecrypted[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [shareItemTarget, setShareItemTarget] = useState<{ id: string, title: string, myEncryptedKey: string } | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        if (isUnlocked && privateKey) {
            fetchAndDecryptItems();
        }
    }, [isUnlocked, privateKey]);

    const fetchAndDecryptItems = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/vault/items');
            if (!res.ok) throw new Error('Failed to fetch items');
            const data: VaultItemRaw[] = await res.json();
            setRawItems(data);

            const decryptedPromises = data.map(async (item) => {
                if (!item.myEncryptedKey || !item.encryptedData || !item.iv) {
                    return { ...item, payload: null };
                }

                try {
                    // Decrypt AES Item Key using RSA Private Key
                    const itemKey = await decryptItemKeyWithRSA(privateKey!, item.myEncryptedKey);
                    
                    // Decrypt Payload using AES Item Key
                    const payload = await decryptItemPayload(itemKey, item.encryptedData, item.iv);
                    return { ...item, payload };
                } catch (e) {
                    console.error("Failed to decrypt item:", item.title, e);
                    return { ...item, payload: null, error: true };
                }
            });

            const decrypted = await Promise.all(decryptedPromises);
            setDecryptedItems(decrypted);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load vault items');
        } finally {
            setIsLoading(false);
        }
    };

    const copyPassword = (id: string, password: string) => {
        navigator.clipboard.writeText(password);
        setCopiedId(id);
        toast.success('Password copied to clipboard', {
            icon: '📋',
            style: {
                borderRadius: '10px',
                background: '#333',
                color: '#fff',
            },
        });

        // Clear clipboard after 30 seconds for security
        setTimeout(() => {
            navigator.clipboard.writeText('');
            if (copiedId === id) setCopiedId(null);
        }, 30000);
        
        setTimeout(() => setCopiedId(null), 2000);
    };

    const filteredItems = useMemo(() => {
        if (!searchTerm) return decryptedItems;
        const lower = searchTerm.toLowerCase();
        return decryptedItems.filter(item => 
            item.title?.toLowerCase().includes(lower) || 
            item.username?.toLowerCase().includes(lower) ||
            item.website?.toLowerCase().includes(lower)
        );
    }, [decryptedItems, searchTerm]);

    return (
        <div className="flex h-[calc(100vh-12rem)] min-h-[600px] bg-slate-50 dark:bg-secondary-900 rounded-3xl border border-secondary-200 dark:border-secondary-800 overflow-hidden shadow-2xl">
            {/* Sidebar */}
            <div className="w-64 border-r border-secondary-200 dark:border-secondary-800 bg-white dark:bg-secondary-950 flex flex-col">
                <div className="p-4 border-b border-secondary-200 dark:border-secondary-800 hidden md:block">
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-primary-600/20 flex items-center justify-center gap-2"
                    >
                        <Plus size={18} />
                        New Item
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400">
                        <KeyRound size={18} />
                        All Items
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors">
                        <Star size={18} />
                        Favorites
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors">
                        <FolderIcon size={18} />
                        Folders
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col bg-white dark:bg-secondary-900 w-full relative">
                <div className="p-4 border-b border-secondary-200 dark:border-secondary-800 flex items-center gap-4">
                    <div className="relative flex-1 max-w-lg">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search Vault..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-secondary-100 dark:bg-secondary-800/50 border-transparent text-secondary-900 dark:text-white rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all placeholder-secondary-400"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-secondary-500 dark:text-secondary-400">
                            <KeyRound size={48} className="mb-4 opacity-50" />
                            <p className="text-lg font-medium">No items found</p>
                            <p className="text-sm mt-1">Your secure vault is empty or no matches found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredItems.map(item => (
                                <div key={item.id} className="group bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-2xl p-4 hover:border-primary-500/50 hover:shadow-lg transition-all">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0 border border-primary-200 dark:border-primary-800/50 overflow-hidden">
                                                {item.icon ? <img src={item.icon} alt="" className="w-5 h-5 object-contain" /> : <KeyRound size={20} />}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-secondary-900 dark:text-white line-clamp-1">{item.title}</h3>
                                                <p className="text-xs text-secondary-500 dark:text-secondary-400 line-clamp-1">{item.username || 'No username'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {item.payload?.error ? (
                                        <div className="flex items-center gap-2 text-danger-500 text-xs font-medium bg-danger-50 dark:bg-danger-900/20 px-3 py-2 rounded-lg">
                                            <ShieldAlert size={14} /> Decryption Failed
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => item.payload?.password && copyPassword(item.id, item.payload.password)}
                                                className="flex-1 px-3 py-2 bg-secondary-100 object-cover dark:bg-secondary-900 text-secondary-700 dark:text-secondary-300 rounded-lg text-xs font-medium hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center justify-center gap-2"
                                            >
                                                {copiedId === item.id ? <Check size={14} className="text-success-500" /> : <Copy size={14} />}
                                                {copiedId === item.id ? 'Copied' : 'Copy Password'}
                                            </button>
                                            <button 
                                                onClick={() => item.myEncryptedKey && setShareItemTarget({ id: item.id, title: item.title, myEncryptedKey: item.myEncryptedKey })}
                                                className="px-3 py-2 bg-secondary-100 dark:bg-secondary-900 text-secondary-700 dark:text-secondary-300 rounded-lg text-xs font-medium hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors flex items-center justify-center gap-1"
                                                title="Share securely"
                                            >
                                                <Share2 size={14} />
                                            </button>
                                            <button className="px-3 py-2 bg-secondary-100 dark:bg-secondary-900 text-secondary-700 dark:text-secondary-300 rounded-lg text-xs font-medium hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors">
                                                View
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {isAddModalOpen && (
                <AddItemModal 
                    onClose={() => setIsAddModalOpen(false)} 
                    onSuccess={() => {
                        setIsAddModalOpen(false);
                        fetchAndDecryptItems();
                    }} 
                />
            )}

            {shareItemTarget && (
                <ShareItemModal 
                    item={shareItemTarget}
                    onClose={() => setShareItemTarget(null)}
                />
            )}
        </div>
    );
}

