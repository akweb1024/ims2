import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'STM Customer Management System',
    description: 'Centralized platform for managing journal subscriptions, customers, and sales channels',
};

import { ThemeProvider } from '@/components/theme/ThemeProvider';

import QueryProvider from '@/components/providers/QueryProvider';
import AuthProvider from '@/components/providers/AuthProvider';
import ToastProvider from '@/components/providers/ToastProvider';
import SkipNavigation from '@/components/ui/SkipNavigation';

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className="antialiased" suppressHydrationWarning>
                <SkipNavigation />
                <QueryProvider>
                    <AuthProvider>
                        <ThemeProvider>
                            {children}
                            <ToastProvider />
                        </ThemeProvider>
                    </AuthProvider>
                </QueryProvider>
            </body>
        </html>
    );
}
