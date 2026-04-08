'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isLoading?: boolean;
    hasScreenshot?: boolean;
}

interface AIChatWidgetProps {
    className?: string;
}

const SUGGESTED_PROMPTS = [
    '🖼️ What do you see on my screen?',
    '📊 Explain what\'s on this page',
    '🔍 What options are available here?',
    '📋 Show dashboard stats',
    '🗺️ How do I navigate to HR?',
];

// Capture the page screenshot as base64 JPEG, hiding the chat widget
async function capturePageScreenshot(): Promise<string | null> {
    try {
        // Dynamically import html2canvas to avoid SSR issues
        const html2canvas = (await import('html2canvas')).default;

        // Temporarily hide the chat widget itself so it's not in the screenshot
        const chatPanel = document.getElementById('aria-chat-panel');
        const chatToggle = document.getElementById('aria-chat-toggle');
        const feedbackWidget = document.querySelector('[data-id="feedback-widget"]') as HTMLElement;

        const prevPanelDisplay = chatPanel?.style.display;
        const prevToggleDisplay = chatToggle?.parentElement?.style.visibility;

        if (chatPanel) chatPanel.style.display = 'none';
        if (chatToggle?.parentElement) chatToggle.parentElement.style.visibility = 'hidden';
        if (feedbackWidget) feedbackWidget.style.display = 'none';

        // Capture at reduced resolution for faster transfer
        const canvas = await html2canvas(document.documentElement, {
            scale: 0.6,            // 60% resolution — good balance of detail vs size
            useCORS: true,
            allowTaint: true,
            logging: false,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            scrollX: -window.scrollX,
            scrollY: -window.scrollY,
            width: window.innerWidth,
            height: window.innerHeight,
        });

        // Restore widget visibility
        if (chatPanel) chatPanel.style.display = prevPanelDisplay || '';
        if (chatToggle?.parentElement) chatToggle.parentElement.style.visibility = prevToggleDisplay || '';
        if (feedbackWidget) feedbackWidget.style.display = '';

        // Convert to JPEG at 75% quality to keep payload small
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        // Return just the base64 part (remove the data:image/jpeg;base64, prefix)
        return dataUrl.split(',')[1] || null;
    } catch (err) {
        console.warn('[AIChatWidget] Screenshot capture failed:', err);
        return null;
    }
}

export default function AIChatWidget({ className = '' }: AIChatWidgetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [hasNewMessage, setHasNewMessage] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [screenVisionEnabled, setScreenVisionEnabled] = useState(true);

    // Persistence: load state from localStorage on mount
    useEffect(() => {
        const savedOpen = localStorage.getItem('aria_chat_open') === 'true';
        const savedVision = localStorage.getItem('aria_vision_enabled') !== 'false'; // default true
        if (savedOpen) setIsOpen(true);
        setScreenVisionEnabled(savedVision);
    }, []);

    // Persistence: save state on change
    useEffect(() => {
        localStorage.setItem('aria_chat_open', isOpen.toString());
    }, [isOpen]);

    useEffect(() => {
        localStorage.setItem('aria_vision_enabled', screenVisionEnabled.toString());
    }, [screenVisionEnabled]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const router = useRouter();
    const pathname = usePathname();
    const { data: session } = useSession();

    const user = session?.user as any;

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
            inputRef.current?.focus();
        }
    }, [messages, isOpen, scrollToBottom]);

    const handleOpen = () => {
        setIsOpen(true);
        setHasNewMessage(false);
        if (messages.length === 0) {
            setMessages([
                {
                    role: 'assistant',
                    content: `Hello${user?.name ? `, **${user.name.split(' ')[0]}**` : ''}! 👋 I'm **STM Aria**, your AI assistant.\n\n👁️ **Screen Vision is ON** — I can see your current screen and answer questions about what's displayed, available options, and how to use each feature.\n\nTry asking:\n- *"What do you see on my screen?"*\n- *"What options are available here?"*\n- *"Explain what this page does"*`,
                    timestamp: new Date(),
                },
            ]);
        }
    };

    const sendMessage = useCallback(async (messageText?: string) => {
        const text = (messageText || input).trim();
        if (!text || isLoading) return;

        setInput('');
        setIsLoading(true);
        setShowSuggestions(false);

        // Capture screenshot BEFORE closing the chat (while page is still visible behind)
        let screenshotBase64: string | null = null;
        if (screenVisionEnabled) {
            setIsCapturing(true);
            screenshotBase64 = await capturePageScreenshot();
            setIsCapturing(false);
        }

        const userMessage: ChatMessage = {
            role: 'user',
            content: text,
            timestamp: new Date(),
            hasScreenshot: !!screenshotBase64,
        };

        setMessages(prev => [
            ...prev,
            userMessage,
            {
                role: 'assistant',
                content: '',
                timestamp: new Date(),
                isLoading: true,
            },
        ]);

        try {
            const historyMessages = [...messages, userMessage].map(m => ({
                role: m.role,
                content: m.content,
            }));

            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: historyMessages,
                    context: {
                        currentPage: pathname || '/dashboard',
                        userRole: user?.role || 'USER',
                        userId: user?.id,
                        companyId: user?.companyId,
                    },
                    screenshotBase64: screenshotBase64 || undefined,
                    screenshotMimeType: 'image/jpeg',
                }),
            });

            if (!res.ok) throw new Error(`API error: ${res.status}`);

            // Consumption of the ReadableStream
            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let fullReply = '';

            if (!reader) throw new Error('Failed to initialize stream reader');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                // API sends JSON objects separated by newlines
                const lines = chunk.split('\n').filter(l => l.trim());

                for (const line of lines) {
                    try {
                        const parsed = JSON.parse(line);
                        if (parsed.text) {
                            fullReply += parsed.text;

                            // Update the last message (the assistant one) with new content
                            setMessages(prev => {
                                const newMessages = [...prev];
                                const lastIdx = newMessages.length - 1;
                                if (lastIdx >= 0 && newMessages[lastIdx].isLoading) {
                                    newMessages[lastIdx] = {
                                        ...newMessages[lastIdx],
                                        content: fullReply,
                                        isLoading: false,
                                    };
                                } else if (lastIdx >= 0 && newMessages[lastIdx].role === 'assistant') {
                                    newMessages[lastIdx] = {
                                        ...newMessages[lastIdx],
                                        content: fullReply
                                    };
                                }
                                return newMessages;
                            });
                        }
                    } catch (e) {
                        console.warn('Failed to parse chunk', e);
                    }
                }
            }

            // After stream completes, check for navigation actions
            const navMatch = fullReply.match(/\[\[navigate:([^\]]+)\]\]/);
            if (navMatch?.[1]) {
                const href = navMatch[1].trim();
                // Clean the reply in the UI state
                const cleanReply = fullReply.replace(/\[\[navigate:[^\]]+\]\]/g, '').trim();
                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastIdx = newMessages.length - 1;
                    if (lastIdx >= 0) {
                        newMessages[lastIdx].content = cleanReply;
                    }
                    return newMessages;
                });
                setTimeout(() => router.push(href), 800);
            }

            if (!isOpen) setHasNewMessage(true);
        } catch (err) {
            console.error('[AIChatWidget]', err);
            setMessages(prev => [
                ...prev.filter(m => !m.isLoading),
                {
                    role: 'assistant',
                    content: '⚠️ I encountered an error. Please try again.',
                    timestamp: new Date(),
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, messages, pathname, user, router, isOpen, screenVisionEnabled]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const clearHistory = () => {
        setMessages([]);
        setShowSuggestions(true);
    };

    const pageLabel = pathname
        ? pathname.split('/').filter(Boolean).map(p =>
            p.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        ).slice(-2).join(' › ')
        : 'Dashboard';

    return (
        <>
            {/* Floating Trigger Button */}
            <div
                className={`fixed bottom-6 right-6 z-40 ${className}`}
                style={{ zIndex: 9998 }}
            >
                {hasNewMessage && !isOpen && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-ping z-10" />
                )}

                <button
                    id="aria-chat-toggle"
                    onClick={() => isOpen ? setIsOpen(false) : handleOpen()}
                    aria-label="Toggle AI assistant"
                    className="group relative w-14 h-14 rounded-2xl shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 overflow-hidden"
                    style={{
                        background: isOpen
                            ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                            : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                        boxShadow: isOpen
                            ? '0 8px 30px rgba(37, 99, 235, 0.2)'
                            : '0 8px 30px rgba(37, 99, 235, 0.4)',
                    }}
                >
                    {!isOpen && (
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%)' }} />
                    )}
                    <div className="flex items-center justify-center w-full h-full">
                        {isCapturing ? (
                            // Camera icon when capturing screenshot
                            <svg className="w-6 h-6 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        ) : isOpen ? (
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        )}
                    </div>
                    {!isOpen && (
                        <div className="absolute inset-0 rounded-2xl animate-ping opacity-20"
                            style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', animationDuration: '2s' }} />
                    )}
                </button>
            </div>

            {/* Chat Panel */}
            <div
                id="aria-chat-panel"
                className="fixed bottom-24 right-6 z-50 transition-all duration-300"
                style={{
                    width: '390px',
                    maxHeight: '82vh',
                    zIndex: 9997,
                    opacity: isOpen ? 1 : 0,
                    pointerEvents: isOpen ? 'all' : 'none',
                    transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.96)',
                    transformOrigin: 'bottom right',
                }}
            >
                <div className="flex flex-col rounded-3xl overflow-hidden"
                    style={{
                        height: 'min(620px, 82vh)',
                        background: '#ffffff',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        boxShadow: '0 25px 80px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.04)',
                    }}>

                    {/* Header */}
                    <div className="flex-shrink-0 px-5 py-4 flex items-center justify-between"
                        style={{ background: 'linear-gradient(135deg, #1e293b 0%, #1e3a5f 100%)' }}>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' }}>
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-white font-black text-sm tracking-tight">STM Aria</h3>
                                    <span className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
                                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                        <span className="text-emerald-400 text-[9px] font-black uppercase tracking-wider">Online</span>
                                    </span>
                                </div>
                                <p className="text-slate-400 text-[10px] font-medium">AI Assistant · Powered by Gemini</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            {/* Screen Vision toggle */}
                            <button
                                onClick={() => setScreenVisionEnabled(v => !v)}
                                title={screenVisionEnabled ? 'Screen Vision ON — click to disable' : 'Screen Vision OFF — click to enable'}
                                className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all text-[9px] font-black uppercase tracking-wider ${
                                    screenVisionEnabled
                                        ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
                                        : 'bg-white/5 border border-white/10 text-slate-500'
                                }`}
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {screenVisionEnabled ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    )}
                                </svg>
                                {screenVisionEnabled ? '👁 On' : 'Off'}
                            </button>

                            {messages.length > 0 && (
                                <button onClick={clearHistory} title="Clear conversation"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            )}

                            <button onClick={() => setIsOpen(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Context & Vision Status Bar */}
                    <div className="flex-shrink-0 px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Context</span>
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-full">
                            <svg className="w-2.5 h-2.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            <span className="text-blue-600 text-[9px] font-bold">{pageLabel}</span>
                        </span>
                        {user?.role && (
                            <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 text-[9px] font-bold">
                                {user.role.replace(/_/g, ' ')}
                            </span>
                        )}
                        {/* Vision status pill */}
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            screenVisionEnabled
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                : 'bg-slate-100 border-slate-200 text-slate-400'
                        }`}>
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {screenVisionEnabled ? 'Screen Vision' : 'Vision Off'}
                        </span>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: 'thin' }}>
                        {showSuggestions && messages.length === 0 && (
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-slate-400 text-center">Try asking...</p>
                                {SUGGESTED_PROMPTS.map((prompt, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => { handleOpen(); sendMessage(prompt.replace(/^[^\s]+\s/, '')); }}
                                        className="w-full text-left px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 text-xs text-slate-600 hover:text-blue-700 font-medium transition-all"
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className="w-7 h-7 rounded-xl flex-shrink-0 flex items-center justify-center text-[11px] font-black text-white"
                                    style={{
                                        background: msg.role === 'user'
                                            ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                                            : 'linear-gradient(135deg, #1e293b, #334155)',
                                    }}>
                                    {msg.role === 'user' ? (user?.name?.charAt(0) || 'U') : '✦'}
                                </div>

                                <div className={`max-w-[78%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                                    {/* Screenshot capture indicator */}
                                    {msg.role === 'user' && msg.hasScreenshot && (
                                        <div className="flex items-center gap-1 self-end mb-0.5">
                                            <svg className="w-2.5 h-2.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span className="text-[8px] text-blue-400 font-bold">+screenshot</span>
                                        </div>
                                    )}

                                    <div className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                                        msg.role === 'user'
                                            ? 'text-white rounded-tr-sm'
                                            : 'text-slate-800 rounded-tl-sm border border-slate-100'
                                    }`} style={{
                                        background: msg.role === 'user'
                                            ? 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)'
                                            : '#f8fafc',
                                    }}>
                                        {msg.isLoading ? (
                                            <div className="flex items-center gap-1.5 py-1">
                                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        ) : (
                                            <div className={`prose prose-xs max-w-none ${msg.role === 'user' ? 'prose-invert' : ''}`}
                                                style={{ fontSize: '12px', lineHeight: '1.6' }}>
                                                <ReactMarkdown
                                                    components={{
                                                        p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                                                        ul: ({ children }) => <ul className="my-1 pl-4 space-y-0.5">{children}</ul>,
                                                        ol: ({ children }) => <ol className="my-1 pl-4 space-y-0.5">{children}</ol>,
                                                        li: ({ children }) => <li className="text-[11px]">{children}</li>,
                                                        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                                                        h2: ({ children }) => <h2 className="text-xs font-black mb-1.5 mt-2">{children}</h2>,
                                                        h3: ({ children }) => <h3 className="text-xs font-bold mb-1 mt-2">{children}</h3>,
                                                        code: ({ children }) => <code className="text-[10px] bg-black/10 px-1 py-0.5 rounded font-mono">{children}</code>,
                                                        blockquote: ({ children }) => <blockquote className="border-l-2 border-blue-300 pl-2 italic opacity-80">{children}</blockquote>,
                                                    }}
                                                >
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                    </div>

                                    <span className="text-[9px] text-slate-400 font-medium px-1">
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Capturing overlay */}
                    {isCapturing && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center rounded-3xl z-10 overflow-hidden">
                            {/* Scanning line animation */}
                            <div 
                                className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50 z-20"
                                style={{ 
                                    top: '0%', 
                                    animation: 'scan-line 1.5s ease-in-out infinite',
                                    filter: 'blur(1px)'
                                }}
                            />
                            <style jsx>{`
                                @keyframes scan-line {
                                    0% { top: 0%; opacity: 0; }
                                    20% { opacity: 0.8; }
                                    80% { opacity: 0.8; }
                                    100% { top: 100%; opacity: 0; }
                                }
                            `}</style>
                            
                            <div className="text-center relative z-30">
                                <div className="w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-2"
                                    style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
                                    <svg className="w-5 h-5 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Capturing screen...</p>
                                <p className="text-[10px] text-slate-500 font-medium mt-1">Aria is analyzing your UI context</p>
                            </div>
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="flex-shrink-0 p-3 border-t border-slate-100 bg-white">
                        {/* Vision hint when enabled */}
                        {screenVisionEnabled && !isLoading && (
                            <div className="flex items-center gap-1.5 mb-2 px-1">
                                <svg className="w-3 h-3 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span className="text-[9px] text-blue-400 font-medium">Aria will capture your screen with each message</span>
                            </div>
                        )}

                        <div className="flex gap-2 items-end">
                            <div className="flex-1 relative">
                                <textarea
                                    ref={inputRef}
                                    id="aria-chat-input"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={screenVisionEnabled ? "Ask about this page or anything..." : "Ask STM Aria anything..."}
                                    rows={1}
                                    disabled={isLoading}
                                    className="w-full resize-none text-xs text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-50"
                                    style={{ minHeight: '40px', maxHeight: '100px', lineHeight: '1.5' }}
                                    onInput={(e) => {
                                        const t = e.target as HTMLTextAreaElement;
                                        t.style.height = 'auto';
                                        t.style.height = Math.min(t.scrollHeight, 100) + 'px';
                                    }}
                                />
                            </div>

                            <button
                                id="aria-send-button"
                                onClick={() => sendMessage()}
                                disabled={isLoading || !input.trim()}
                                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 flex-shrink-0"
                                style={{
                                    background: input.trim() && !isLoading
                                        ? 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)'
                                        : '#e2e8f0',
                                }}
                            >
                                {isLoading ? (
                                    <svg className="w-4 h-4 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                ) : (
                                    <svg className={`w-4 h-4 ${input.trim() ? 'text-white' : 'text-slate-400'}`}
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                )}
                            </button>
                        </div>

                        <p className="text-[9px] text-slate-400 font-medium text-center mt-2">
                            Press <kbd className="px-1 py-0.5 bg-slate-100 rounded text-[8px] font-mono">Enter</kbd> to send
                            {screenVisionEnabled && ' · 📸 Screenshot included'} · Powered by Google Gemini
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
