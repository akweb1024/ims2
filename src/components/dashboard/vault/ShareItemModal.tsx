"use client";

import React, { useState } from 'react';
import { encryptItemKeyWithRSA, decryptItemKeyWithRSA } from '@/lib/crypto-vault';
import { useVault } from './VaultContext';
import { X, Share2, Loader2, Users } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
    item: { id: string; title: string; myEncryptedKey: string };
    onClose: () => void;
}

export default function ShareItemModal({ item, onClose }: Props) {
    const { privateKey } = useVault();
    const [targetEmail, setTargetEmail] = useState('');
    const [canEdit, setCanEdit] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleShare = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!privateKey) {
            toast.error("Private key not loaded.");
            return;
        }

        setIsLoading(true);

        try {
            // 1. Fetch Target User's Public Key
            const targetRes = await fetch(`/api/vault/public-key?email=${encodeURIComponent(targetEmail)}`);
            if (!targetRes.ok) {
                const errorData = await targetRes.json();
                throw new Error(errorData.error || 'User not found or has no vault keyring');
            }
            
            const targetData = await targetRes.json();
            const targetPublicKeySpki = targetData.publicKey;
            const grantedToId = targetData.id;

            // 2. Decrypt the AES Item Key using MY Private Key
            const itemKey = await decryptItemKeyWithRSA(privateKey, item.myEncryptedKey);

            // 3. Re-encrypt the AES Item Key using the TARGET's Public Key
            const newEncryptedKey = await encryptItemKeyWithRSA(targetPublicKeySpki, itemKey);

            // 4. Send the sharing record to the server
            const shareRes = await fetch('/api/vault/share', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemId: item.id,
                    grantedToId: grantedToId,
                    encryptedKey: newEncryptedKey,
                    canEdit
                })
            });

            if (!shareRes.ok) {
                throw new Error("Failed to share item");
            }

            toast.success(`Securely shared "${item.title}" with ${targetData.name}`);
            onClose();

        } catch (error: any) {
             console.error(error);
             toast.error(error.message || 'Failed to share item securely');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
            <div className="bg-white dark:bg-secondary-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-secondary-200 dark:border-secondary-800 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-5 border-b border-secondary-200 dark:border-secondary-800 bg-secondary-50 dark:bg-secondary-900/50">
                    <h3 className="text-lg font-bold text-secondary-900 dark:text-white flex items-center gap-2">
                        <Share2 size={18} className="text-primary-500" />
                        Share Item
                    </h3>
                    <button onClick={onClose} className="p-2 text-secondary-500 hover:bg-secondary-200 dark:hover:bg-secondary-800 rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="flex items-center gap-3 mb-6 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800/50 rounded-2xl">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-secondary-800 flex items-center justify-center shadow-sm">
                            <Users size={18} className="text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                            <p className="text-sm text-secondary-500 dark:text-secondary-400">Sharing</p>
                            <p className="font-semibold text-secondary-900 dark:text-white">{item.title}</p>
                        </div>
                    </div>

                    <form onSubmit={handleShare} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                                Recipient Email Address
                            </label>
                            <input
                                type="email"
                                value={targetEmail}
                                onChange={(e) => setTargetEmail(e.target.value)}
                                placeholder="colleague@example.com"
                                className="w-full bg-secondary-100 dark:bg-secondary-800/50 border-transparent text-secondary-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                required
                            />
                            <p className="text-xs text-secondary-500 mt-2">
                                The recipient must be a registered IMS user and must have initialized their Web Vault.
                            </p>
                        </div>

                        <label className="flex items-center gap-3 p-3 border border-secondary-200 dark:border-secondary-700 rounded-xl cursor-pointer hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors">
                            <input 
                                type="checkbox" 
                                checked={canEdit} 
                                onChange={(e) => setCanEdit(e.target.checked)}
                                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                            />
                            <div className="text-sm">
                                <p className="font-medium text-secondary-900 dark:text-white">Allow recipient to edit</p>
                                <p className="text-secondary-500 text-xs">They will be able to update the password and notes.</p>
                            </div>
                        </label>

                        <div className="flex gap-3 justify-end mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 text-secondary-600 dark:text-secondary-400 font-medium hover:bg-secondary-100 dark:hover:bg-secondary-800 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !targetEmail}
                                className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-xl transition-shadow shadow-lg shadow-primary-600/20 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
                                {isLoading ? 'Encrypting Key...' : 'Share Securely'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
