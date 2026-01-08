'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showCompanySelection, setShowCompanySelection] = useState(false);
    const [availableCompanies, setAvailableCompanies] = useState<any[]>([]);

    const redirectUrl = searchParams.get('redirect_url') || '/dashboard';

    const handleSelectCompany = async (companyId: string) => {
        setLoading(true);
        try {
            // 1. Update the session with selected company
            // We can call /api/auth/select-company which will update DB and then we tell next-auth to update
            const res = await fetch('/api/auth/select-company', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyId })
            });

            const data = await res.json();
            if (res.ok) {
                // In a real NextAuth v5 app, we would use update() from useSession
                // But for now, we'll just redirect since we updated the DB and the next session fetch will get it
                // Or we can just call signIn again with the same credentials if redirect:true
                window.location.href = redirectUrl;
            } else {
                setError(data.error || 'Selection failed');
            }
        } catch (err) {
            setError('An error occurred during selection');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // 1. Call NextAuth signIn
            const result = await signIn('credentials', {
                email: formData.email,
                password: formData.password,
                redirect: false,
            });

            if (result?.error) {
                setError('Invalid email or password');
                setLoading(false);
                return;
            }

            // 2. Check if company selection is required
            // We'll call /api/auth/me to see the current state
            const meRes = await fetch('/api/auth/me');
            const meData = await meRes.json();

            if (meRes.ok) {
                const { user, availableCompanies } = meData;

                // Determine if selection is needed
                const isInternalRole = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role);
                const requiresSelection = isInternalRole && availableCompanies.length > 1 && !user.companyId;

                if (requiresSelection) {
                    setAvailableCompanies(availableCompanies);
                    setShowCompanySelection(true);
                } else {
                    window.location.href = redirectUrl;
                }
            } else {
                window.location.href = redirectUrl;
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (showCompanySelection) {
        return (
            <div className="p-8 animate-in fade-in duration-500">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">Select Company</h1>
                    <p className="text-slate-600 mt-2">Choose a company to manage</p>
                </div>

                <div className="space-y-4">
                    {availableCompanies.map((comp) => (
                        <button
                            key={comp.id}
                            onClick={() => handleSelectCompany(comp.id)}
                            disabled={loading}
                            className="w-full p-4 text-left border border-slate-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all group flex items-center justify-between"
                        >
                            <div>
                                <h3 className="font-bold text-slate-900 group-hover:text-primary-700">{comp.name}</h3>
                                {comp.registrationNumber && (
                                    <p className="text-sm text-slate-500">{comp.registrationNumber}</p>
                                )}
                            </div>
                            <svg className="w-5 h-5 text-slate-400 group-hover:text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => setShowCompanySelection(false)}
                    className="w-full mt-6 text-slate-500 hover:text-slate-700 text-sm font-medium"
                >
                    Back to Login
                </button>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Welcome Back</h1>
                <p className="text-slate-600 mt-2">Sign in to your account to continue</p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Email Address
                    </label>
                    <input
                        type="email"
                        required
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Password
                    </label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all pr-10"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                        >
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                    {loading ? (
                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                    ) : 'Sign In'}
                </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-600">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-primary-600 hover:text-primary-700 font-bold">
                    Create one
                </Link>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center gap-2">
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest text-center">Troubleshooting</p>
                <button
                    onClick={() => {
                        localStorage.clear();
                        window.location.reload();
                    }}
                    className="text-xs text-slate-500 hover:text-danger-500 transition-colors underline decoration-dotted"
                >
                    Clear saved sessions & reset app
                </button>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
                    <LoginForm />
                </Suspense>
                <div className="bg-slate-50 p-4 text-center text-xs text-slate-500 border-t border-slate-100">
                    &copy; {new Date().getFullYear()} STM Management. All rights reserved.
                </div>
            </div>
        </div>
    );
}
