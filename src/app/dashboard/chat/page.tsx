'use client';

import { Suspense } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { ChatProvider } from '@/components/dashboard/chat/ChatContext';
import ChatSidebar from '@/components/dashboard/chat/ChatSidebar';
import ChatWindow from '@/components/dashboard/chat/ChatWindow';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

function ChatLayout() {
    return (
        <div className="h-[calc(100vh-8rem)] bg-white dark:bg-gray-900 rounded-[2rem] overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800 flex">
            <ChatSidebar />
            <ChatWindow />
        </div>
    );
}

export default function ChatPage() {
    return (
        <DashboardLayout>
            <Suspense fallback={
                <div className="h-[80vh] flex items-center justify-center">
                    <Loader2 className="animate-spin text-indigo-600" size={40} />
                </div>
            }>
                <ChatProvider>
                    <ChatLayout />
                </ChatProvider>
            </Suspense>
        </DashboardLayout>
    );
}

