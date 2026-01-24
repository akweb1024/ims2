'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import FormField from '@/components/ui/FormField';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validation/schemas';
import { showError } from '@/lib/toast';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const onSubmit = async (data: ForgotPasswordFormData) => {
        setLoading(true);
        setSuccess(false);

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await res.json();

            if (res.ok) {
                setSuccess(true);
            } else {
                showError(result.error || 'Failed to send reset email');
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            showError('A network error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Glassmorphism Card */}
                <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
                    {/* Logo/Brand */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl font-bold mb-4">
                            STM
                        </div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">
                            Forgot Password?
                        </h1>
                        <p className="text-gray-600">
                            Enter your email and we&apos;ll send you a reset link
                        </p>
                    </div>

                    {success ? (
                        <div className="space-y-6">
                            {/* Success Message */}
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">✅</span>
                                    <div>
                                        <h3 className="font-semibold text-green-800 mb-1">
                                            Check Your Email
                                        </h3>
                                        <p className="text-sm text-green-700">
                                            If an account with that email exists, we&apos;ve sent you a password reset link.
                                            Please check your inbox and spam folder.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Back to Login */}
                            <Link
                                href="/login"
                                className="block w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 text-center"
                            >
                                Back to Login
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                label="Email Address"
                                name="email"
                                type="email"
                                placeholder="your.email@example.com"
                                required
                                register={register}
                                error={errors.email}
                            />

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                            >
                                {loading ? 'Sending...' : 'Send Reset Link'}
                            </button>

                            <div className="text-center">
                                <Link
                                    href="/login"
                                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                                >
                                    ← Back to Login
                                </Link>
                            </div>
                        </form>
                    )}

                    {/* Help Text */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <p className="text-center text-sm text-gray-500">
                            Need help? Contact{' '}
                            <a href="mailto:support@stmcustomer.com" className="text-blue-600 hover:text-blue-700 font-medium">
                                support@stmcustomer.com
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
