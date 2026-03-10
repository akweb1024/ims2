import React, { useState } from 'react';
import { useVault } from './VaultContext';
import { Lock, KeyRound, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function UnlockScreen() {
    const { keyring, unlockVault, setupVault } = useVault();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const isSetup = !keyring?.exists;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (isSetup && password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setIsLoading(true);

        try {
            if (isSetup) {
                await setupVault(password);
            } else {
                const success = await unlockVault(password);
                if (!success) {
                    setError('Incorrect master password');
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh]">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl max-w-md w-full relative overflow-hidden">
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 -m-16 w-32 h-32 bg-primary-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -m-16 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

                <div className="text-center mb-8 relative z-10">
                    <div className="mx-auto w-16 h-16 bg-primary-500/20 text-primary-400 rounded-full flex items-center justify-center mb-4 border border-primary-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                        {isSetup ? <ShieldCheck size={32} /> : <Lock size={32} />}
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        {isSetup ? 'Setup Web Vault' : 'Unlock Web Vault'}
                    </h2>
                    <p className="text-secondary-400 text-sm">
                        {isSetup 
                            ? 'Create a strong master password. This password will encrypt all your data and CANNOT be recovered if lost.'
                            : 'Enter your master password to decrypt your secure vault in memory.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                    <div>
                        <label className="block text-xs font-semibold text-secondary-300 uppercase tracking-wider mb-2">Master Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <KeyRound size={16} className="text-secondary-400" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-secondary-900/50 border border-secondary-700 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder-secondary-500"
                                placeholder="Enter your master password"
                                required
                            />
                        </div>
                    </div>

                    {isSetup && (
                         <div>
                            <label className="block text-xs font-semibold text-secondary-300 uppercase tracking-wider mb-2">Confirm Master Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <KeyRound size={16} className="text-secondary-400" />
                                </div>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-secondary-900/50 border border-secondary-700 text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder-secondary-500"
                                    placeholder="Confirm master password"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm px-4 py-3 rounded-lg flex items-start gap-2">
                            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    {isSetup && (
                        <div className="bg-warning-500/10 border border-warning-500/20 text-warning-400 text-xs px-4 py-3 rounded-lg mt-4">
                            <strong>Zero-Knowledge Architecture:</strong> Your master password never leaves your browser. If you forget it, we cannot recover your vault.
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-3 px-4 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-primary-600/20 flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            isSetup ? 'Initialize Vault' : 'Unlock Vault'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
