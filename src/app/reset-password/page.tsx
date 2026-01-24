'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import FormField from '@/components/ui/FormField';
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validation/schemas';
import { showError } from '@/lib/toast';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [token, setToken] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
    } = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
    });

    useEffect(() => {
        const tokenParam = searchParams.get('token');
        setToken(tokenParam);
    }, [searchParams]);

    const onSubmit = async (data: ResetPasswordFormData) => {
        if (!token) {
            showError('Invalid reset link');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    password: data.password,
                }),
            });

            const result = await res.json();

            if (res.ok) {
                setSuccess(true);
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    router.push('/login');
                }, 3000);
            } else {
                showError(result.error || 'Failed to reset password');
            }
        } catch (error) {
            console.error('Reset password error:', error);
            showError('A network error occurred');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                        <h3 className="font-semibold text-red-800 mb-1">
                            Invalid Reset Link
                        </h3>
                        <p className="text-sm text-red-700 mb-3">
                            This password reset link is invalid or has expired.
                        </p>
                        <Link
                            href="/forgot-password"
                            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                        >
                            Request a new reset link →
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return success ? (
        <div className="space-y-6">
            {/* Success Message */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <span className="text-2xl">✅</span>
                    <div>
                        <h3 className="font-semibold text-green-800 mb-1">
                            Password Reset Successful!
                        </h3>
                        <p className="text-sm text-green-700">
                            Your password has been reset successfully. You can now log in with your new password.
                        </p>
                        <p className="text-sm text-green-600 mt-2">
                            Redirecting to login page...
                        </p>
                    </div>
                </div>
            </div>

            {/* Manual Login Link */}
            <Link
                href="/login"
                className="block w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 text-center"
            >
                Go to Login
            </Link>
        </div>
    ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FormField
                label="New Password"
                name="password"
                type="password"
                placeholder="Enter your new password"
                required
                register={register}
                error={errors.password}
                helpText="Must be at least 8 characters with uppercase, lowercase, and numbers"
            />

            <FormField
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                placeholder="Confirm your new password"
                required
                register={register}
                error={errors.confirmPassword}
            />

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
            >
                {loading ? 'Resetting Password...' : 'Reset Password'}
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
    );
}

export default function ResetPasswordPage() {
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
                            Reset Password
                        </h1>
                        <p className="text-gray-600">
                            Enter your new password below
                        </p>
                    </div>

                    <Suspense fallback={<div>Loading...</div>}>
                        <ResetPasswordForm />
                    </Suspense>

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
