import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

export const metadata: Metadata = {
    title: 'STM Customer Management System',
    description: 'Centralized platform for managing journal subscriptions, customers, and sales channels',
};

import { ThemeProvider } from '@/components/theme/ThemeProvider';

import QueryProvider from '@/components/providers/QueryProvider';
import AuthProvider from '@/components/providers/AuthProvider';
import ToastProvider from '@/components/providers/ToastProvider';
import StaleClientBuildGuard from '@/components/providers/StaleClientBuildGuard';
import SkipNavigation from '@/components/ui/SkipNavigation';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-primary selection:text-primary-foreground`} suppressHydrationWarning>
                <SkipNavigation />
                <QueryProvider>
                    <AuthProvider>
                        <ThemeProvider>
                            {children}
                            <ToastProvider />
                            <StaleClientBuildGuard />
                        </ThemeProvider>
                    </AuthProvider>
                </QueryProvider>
            </body>
        </html>
    );
}
