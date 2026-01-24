'use client';

import { useEffect } from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Global Application Error:', error);
    }, [error]);

    return (
        <html>
            <body>
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #fef3f3 0%, #ffffff 50%, #fff5f5 100%)',
                    padding: '1rem',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                    <div style={{
                        maxWidth: '600px',
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '24px',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        padding: '3rem 2rem',
                        textAlign: 'center'
                    }}>
                        {/* Logo */}
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '80px',
                            height: '80px',
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
                            color: 'white',
                            fontSize: '2rem',
                            fontWeight: 'bold',
                            marginBottom: '2rem'
                        }}>
                            STM
                        </div>

                        {/* Error Icon */}
                        <div style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>
                            💥
                        </div>

                        {/* Title */}
                        <h1 style={{
                            fontSize: '3rem',
                            fontWeight: 'bold',
                            color: '#1f2937',
                            marginBottom: '1rem'
                        }}>
                            Critical Error
                        </h1>

                        {/* Message */}
                        <p style={{
                            fontSize: '1.125rem',
                            color: '#6b7280',
                            marginBottom: '2rem',
                            lineHeight: '1.6'
                        }}>
                            A critical error occurred in the application. Please try reloading the page.
                        </p>

                        {/* Error Details (Development) */}
                        {process.env.NODE_ENV === 'development' && (
                            <div style={{
                                marginBottom: '2rem',
                                padding: '1rem',
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: '12px',
                                textAlign: 'left'
                            }}>
                                <p style={{
                                    fontSize: '0.875rem',
                                    fontFamily: 'monospace',
                                    color: '#991b1b',
                                    wordBreak: 'break-all'
                                }}>
                                    <strong>Error:</strong> {error.message}
                                </p>
                                {error.digest && (
                                    <p style={{
                                        fontSize: '0.75rem',
                                        fontFamily: 'monospace',
                                        color: '#dc2626',
                                        marginTop: '0.5rem'
                                    }}>
                                        <strong>Digest:</strong> {error.digest}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <button
                                onClick={reset}
                                style={{
                                    width: '100%',
                                    background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
                                    color: 'white',
                                    fontWeight: '600',
                                    padding: '1rem 1.5rem',
                                    borderRadius: '12px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '1rem',
                                    transition: 'transform 0.2s',
                                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                Try Again
                            </button>

                            <button
                                onClick={() => window.location.href = '/'}
                                style={{
                                    width: '100%',
                                    background: 'white',
                                    color: '#374151',
                                    fontWeight: '600',
                                    padding: '1rem 1.5rem',
                                    borderRadius: '12px',
                                    border: '2px solid #e5e7eb',
                                    cursor: 'pointer',
                                    fontSize: '1rem',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = '#f9fafb';
                                    e.currentTarget.style.borderColor = '#d1d5db';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'white';
                                    e.currentTarget.style.borderColor = '#e5e7eb';
                                }}
                            >
                                Go to Home
                            </button>
                        </div>

                        {/* Support Info */}
                        <div style={{
                            marginTop: '2rem',
                            paddingTop: '2rem',
                            borderTop: '1px solid #e5e7eb'
                        }}>
                            <p style={{
                                fontSize: '0.875rem',
                                color: '#9ca3af'
                            }}>
                                Need help?{' '}
                                <a
                                    href="mailto:support@stmcustomer.com"
                                    style={{
                                        color: '#3b82f6',
                                        textDecoration: 'none',
                                        fontWeight: '500'
                                    }}
                                >
                                    Contact Support
                                </a>
                            </p>
                            {error.digest && (
                                <p style={{
                                    fontSize: '0.75rem',
                                    color: '#d1d5db',
                                    marginTop: '0.5rem'
                                }}>
                                    Error ID: {error.digest}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
