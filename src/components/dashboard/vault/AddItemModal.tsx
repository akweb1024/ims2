"use client";

import React, { useState } from 'react';
import { useVault } from './VaultContext';
import { generateItemKey, encryptItemPayload, encryptItemKeyWithRSA } from '@/lib/crypto-vault';
import { X, Lock, Save, Loader2, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import PasswordGenerator from './PasswordGenerator';
import { createPortal } from 'react-dom';

export default function AddItemModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
    const { keyring } = useVault();
    const [title, setTitle] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [website, setWebsite] = useState('');
    const [notes, setNotes] = useState('');
    const [showGenerator, setShowGenerator] = useState(false);
    
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!keyring?.publicKey) {
            toast.error("Missing public key. Cannot encrypt.");
            return;
        }

        setIsLoading(true);
        try {
            // 1. Generate a new AES-GCM Sub-Key for this specific item
            const itemKey = await generateItemKey();

            // 2. Prepare Payload
            const payload = {
                password,
                notes,
            };

            // 3. Encrypt Payload using the Item Key
            const { encryptedData, iv } = await encryptItemPayload(itemKey, payload);

            // 4. Encrypt the Item Key using the User's RSA Public Key
            const encryptedKey = await encryptItemKeyWithRSA(keyring.publicKey, itemKey);

            // 5. Send to Server
            // Use domain as icon for convenience if website provided (e.g., https://icon.horse/icon/google.com)
            let icon = '';
            if (website) {
                try {
                    const url = new URL(website.startsWith('http') ? website : `https://${website}`);
                    icon = `https://icon.horse/icon/${url.hostname}`;
                } catch (e) {
                    // Ignore invalid url
                }
            }

            const res = await fetch('/api/vault/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'LOGIN',
                    title,
                    username,
                    website,
                    icon,
                    encryptedData: encryptedData,
                    encryptedKey: encryptedKey,
                    iv: iv,
                    isFavorite: false
                })
            });

            if (!res.ok) throw new Error("Failed to save item");

            toast.success("Item saved securely");
            onSuccess();
        } catch (error) {
            console.error(error);
            toast.error("Error securing & saving item");
        } finally {
            setIsLoading(false);
        }
    };

    return (

        (typeof document !== 'undefined' ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
            <div className="bg-white dark:bg-secondary-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-secondary-200 dark:border-secondary-800 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-5 border-b border-secondary-200 dark:border-secondary-800 bg-secondary-50 dark:bg-secondary-900/50">
                    <h3 className="text-lg font-bold text-secondary-900 dark:text-white flex items-center gap-2">
                        <Lock size={18} className="text-primary-500" />
                        Add Secure Item
                    </h3>
                    <button onClick={onClose} className="p-2 text-secondary-500 hover:bg-secondary-200 dark:hover:bg-secondary-800 rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                            placeholder="e.g. Gmail, Amazon, Bank"
                            className="w-full bg-secondary-100 dark:bg-secondary-800/50 border-transparent text-secondary-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Username / Email</label>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="w-full bg-secondary-100 dark:bg-secondary-800/50 border-transparent text-secondary-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Website URL</label>
                            <input
                                type="text"
                                value={website}
                                onChange={e => setWebsite(e.target.value)}
                                placeholder="https://..."
                                className="w-full bg-secondary-100 dark:bg-secondary-800/50 border-transparent text-secondary-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-end mb-1">
                            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300">Password</label>
                            <button 
                                type="button" 
                                onClick={() => setShowGenerator(!showGenerator)}
                                className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1 font-medium bg-primary-50 dark:bg-primary-900/30 px-2 py-1 rounded transition-colors"
                            >
                                <KeyRound size={12} />
                                {showGenerator ? 'Hide Generator' : 'Generate'}
                            </button>
                        </div>
                        <input
                            type="text"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-secondary-100 dark:bg-secondary-800/50 border-transparent text-secondary-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                        />
                        {showGenerator && (
                            <div className="mt-3">
                                <PasswordGenerator 
                                    onSelectPassword={(p) => {
                                        setPassword(p);
                                        setShowGenerator(false);
                                    }} 
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Secure Notes</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={3}
                            className="w-full bg-secondary-100 dark:bg-secondary-800/50 border-transparent text-secondary-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                        ></textarea>
                    </div>

                     <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-secondary-200 dark:border-secondary-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-secondary-600 dark:text-secondary-400 font-medium hover:bg-secondary-100 dark:hover:bg-secondary-800 rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-xl transition-shadow shadow-lg shadow-primary-600/20 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            {isLoading ? 'Encrypting & Saving...' : 'Save Securely'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    ,

        document.body

        ) : null)

    );
}
