'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Check, X, Loader2, Mail, FileText, UserPlus } from 'lucide-react';

function CoAuthorAcceptContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams?.get('token');

    const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired' | 'declined'>('loading');
    const [invitationData, setInvitationData] = useState<any>(null);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Valid invitation token is required.');
            return;
        }

        // Verify token and get invitation details
        fetch(`/api/author/coauthor/accept?token=${token}`)
            .then(res => res.json())
            .then(data => {
                if (data.valid) {
                    setInvitationData({
                        manuscriptTitle: data.invitation.manuscript.title,
                        journalName: data.invitation.manuscript.journal.name,
                        inviterName: data.invitation.inviter.name || data.invitation.inviter.email
                    });
                    setStatus('loading'); // Show buttons
                } else {
                    setStatus(data.invitation?.status === 'EXPIRED' ? 'expired' : 'error');
                    setMessage(data.error || 'This invitation is no longer valid.');
                }
            })
            .catch(() => {
                setStatus('error');
                setMessage('An error occurred. Please try again later.');
            })
            .finally(() => {
                if (status === 'loading') {
                    // Stay in loading until we check logic
                }
            });
    }, [token]);

    const handleAction = async (action: 'accept' | 'decline') => {
        setStatus('loading');
        try {
            const res = await fetch('/api/author/coauthor/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, action })
            });

            const data = await res.json();
            if (res.ok) {
                setStatus(action === 'accept' ? 'success' : 'declined');
            } else {
                setStatus('error');
                setMessage(data.error || 'Failed to process request.');
            }
        } catch (error) {
            setStatus('error');
            setMessage('Server error. Please try again.');
        }
    };

    if (status === 'loading' && !invitationData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-secondary-50 p-6">
                <div className="card-premium p-8 text-center max-w-md w-full">
                    <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
                    <p className="text-secondary-600 font-medium">Verifying invitation...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-secondary-50 p-6">
            <div className="card-premium p-8 max-w-lg w-full">
                {status === 'success' ? (
                    <div className="text-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check className="w-10 h-10 text-green-600" />
                        </div>
                        <h1 className="text-3xl font-black text-secondary-900 mb-4">Confirmed!</h1>
                        <p className="text-secondary-600 mb-8">
                            You have been added as a co-author to the manuscript. You can now log in to your author dashboard to view the submission.
                        </p>
                        <button
                            onClick={() => router.push('/login')}
                            className="btn-primary w-full"
                        >
                            Go to Login
                        </button>
                    </div>
                ) : status === 'declined' ? (
                    <div className="text-center">
                        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <X className="w-10 h-10 text-orange-600" />
                        </div>
                        <h1 className="text-3xl font-black text-secondary-900 mb-4">Invitation Declined</h1>
                        <p className="text-secondary-600 mb-8">
                            You have successfully declined the invitation. No further action is required.
                        </p>
                        <button
                            onClick={() => router.push('/')}
                            className="btn-secondary w-full"
                        >
                            Back to Homepage
                        </button>
                    </div>
                ) : status === 'error' ? (
                    <div className="text-center">
                        <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-10 h-10 text-rose-600" />
                        </div>
                        <h1 className="text-3xl font-black text-secondary-900 mb-4">Something's Wrong</h1>
                        <p className="text-secondary-600 mb-8">{message}</p>
                        <button
                            onClick={() => router.push('/')}
                            className="btn-secondary w-full"
                        >
                            Back to Homepage
                        </button>
                    </div>
                ) : (
                    <div>
                        <div className="flex justify-center mb-6">
                            <div className="relative">
                                <FileText className="w-16 h-16 text-primary-200" />
                                <UserPlus className="w-8 h-8 text-primary-600 absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-sm" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-black text-secondary-900 text-center mb-2">
                            Co-Author Invitation
                        </h1>
                        <p className="text-secondary-600 text-center mb-8">
                            You have been invited to collaborate on a manuscript.
                        </p>

                        <div className="bg-secondary-50 rounded-xl p-6 mb-8 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-secondary-500 uppercase">Manuscript</label>
                                <p className="text-secondary-900 font-bold leading-tight mt-1">{invitationData?.manuscriptTitle}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-secondary-500 uppercase">Journal</label>
                                <p className="text-secondary-700">{invitationData?.journalName}</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-secondary-500 uppercase">Invited By</label>
                                <p className="text-secondary-700">{invitationData?.inviterName}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => handleAction('decline')}
                                className="btn-secondary border-rose-200 text-rose-600 hover:bg-rose-50"
                            >
                                Decline
                            </button>
                            <button
                                onClick={() => handleAction('accept')}
                                className="btn-primary"
                            >
                                Accept & Continue
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function AlertCircle(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    )
}

export default function CoAuthorAcceptPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-secondary-50 p-6">
                <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
            </div>
        }>
            <CoAuthorAcceptContent />
        </Suspense>
    );
}
