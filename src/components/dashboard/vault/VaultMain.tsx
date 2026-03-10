"use client";

import React from 'react';
import { VaultProvider, useVault } from './VaultContext';
import UnlockScreen from './UnlockScreen';
import VaultDashboard from './VaultDashboard';
import { Lock } from 'lucide-react';

function VaultContent() {
    const { isUnlocked, isLoading, lockVault } = useVault();

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!isUnlocked) {
        return <UnlockScreen />;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button
                    onClick={lockVault}
                    className="flex items-center gap-2 px-4 py-2 bg-secondary-800 text-secondary-300 hover:text-white rounded-lg transition-colors text-sm font-medium"
                >
                    <Lock size={16} />
                    Lock Vault
                </button>
            </div>
            <VaultDashboard />
        </div>
    );
}

export default function VaultMain() {
    return (
        <VaultProvider>
            <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
                <div className="mb-6 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1 tracking-tight">Vault</h1>
                        <p className="text-slate-500 dark:text-slate-400">Zero-Knowledge Secure Credential Manager</p>
                    </div>
                </div>
                <VaultContent />
            </div>
        </VaultProvider>
    );
}
