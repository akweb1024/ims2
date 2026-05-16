'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Command,
  Sparkles,
  Zap,
  X,
  ArrowRight,
  Loader2,
  ChevronRight,
  Keyboard,
  Bell,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/classnames';
import { SYSTEM_ACTIONS, SearchResult } from '@/lib/sentinel/registry';
import { toast } from 'react-hot-toast';

export const CommandNexus: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'SEARCH' | 'AI'>('SEARCH');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [aiResponse, setAiResponse] = useState<{ content: string; suggestions: string[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [liveAlerts, setLiveAlerts] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Real-time listener
  useEffect(() => {
    const eventSource = new EventSource('/api/sentinel/stream');

    eventSource.addEventListener('ai:advice', (e: any) => {
      const data = JSON.parse(e.data);
      if (data.message.includes('Prediction') || data.message.includes('Forecast')) {
        setPredictions(prev => [data, ...prev].slice(0, 2));
      }
      setLiveAlerts(prev => [data, ...prev].slice(0, 3));
      toast(data.message, { icon: '🤖', duration: 5000 });
    });

    eventSource.addEventListener('notification:new', (e: any) => {
      const data = JSON.parse(e.data);
      toast.success(data.title);
    });

    return () => eventSource.close();
  }, []);

  // Toggle Command Center
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
      setAiResponse(null);
      setMode('SEARCH');
    }
  }, [isOpen]);

  // Handle Search/Query
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch('/api/sentinel/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, mode })
        });
        const data = await response.json();

        if (mode === 'SEARCH') {
          setResults(data.results || []);
        } else {
          setAiResponse({ content: data.content, suggestions: data.suggestions });
        }
      } catch (err) {
        console.error('Sentinel Query Failed', err);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query, mode]);

  const handleAction = (url?: string, handler?: () => void) => {
    if (handler) handler();
    if (url) window.location.href = url;
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-2xl bg-[#0f172a]/90 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
          >
            {/* Header / Input */}
            <div className="flex items-center gap-3 p-4 border-b border-slate-700/50">
              {mode === 'SEARCH' ? (
                <Search className="w-5 h-5 text-slate-400" />
              ) : (
                <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
              )}
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={mode === 'SEARCH' ? "Search anything... (Employees, Journals, Actions)" : "Ask Sentinel AI... (e.g. 'Who is at risk of overload?')"}
                className="flex-1 bg-transparent border-none outline-none text-slate-100 placeholder:text-slate-500 text-lg"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMode(mode === 'SEARCH' ? 'AI' : 'SEARCH')}
                  className={cn(
                    "px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1",
                    mode === 'AI' ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-slate-800 text-slate-400 border border-slate-700"
                  )}
                >
                  {mode === 'AI' ? <Sparkles className="w-3 h-3" /> : <Command className="w-3 h-3" />}
                  {mode === 'AI' ? 'AI Mode' : 'Search'}
                </button>
                <div className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-500 font-mono">
                  ESC
                </div>
              </div>
            </div>

            {/* Results Area */}
            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
              {isLoading && (
                <div className="p-8 flex flex-col items-center justify-center gap-3 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  <p className="text-sm">Sentinel is thinking...</p>
                </div>
              )}

              {/* AI Response Mode */}
              {!isLoading && mode === 'AI' && aiResponse && (
                <div className="p-6">
                  <div className="flex gap-4">
                    <div className="mt-1 w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="space-y-4">
                      <p className="text-slate-200 leading-relaxed italic text-lg">
                        "{aiResponse.content}"
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {aiResponse.suggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => setQuery(s)}
                            className="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700 border border-slate-700 rounded-full text-xs text-slate-300 transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Live Intelligence Feed (Shown when no search results) */}
              {mode === 'SEARCH' && query.length < 2 && liveAlerts.length > 0 && (
                <div className="px-4 py-2">
                  <p className="px-3 py-2 text-[10px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                    Live Intelligence
                  </p>

                  {predictions.length > 0 && (
                    <div className="px-3 mb-4 space-y-2">
                      <div className="flex items-center gap-2 text-[10px] text-cyan-400 font-black uppercase tracking-tighter italic">
                        <Zap className="w-3 h-3 fill-current" />
                        Forecasting Engine
                      </div>
                      {predictions.map((p, i) => (
                        <div key={i} className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                          <p className="text-[10px] text-cyan-100">{p.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-1">
                    {liveAlerts.map((alert, i) => (
                      <div key={i} className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex gap-3 items-start">
                        <Bell className="w-4 h-4 text-indigo-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-200">{alert.message}</p>
                          <p className="text-[10px] text-indigo-400/60 mt-1">{alert.time || 'Just now'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Results Mode */}
              {!isLoading && mode === 'SEARCH' && (
                <div className="p-2">
                  {/* Dynamic Results */}
                  {results.length > 0 && (
                    <div className="mb-4">
                      <p className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Matched Entities</p>
                      {results.map((res, i) => (
                        <button
                          key={res.id}
                          onClick={() => handleAction(res.url)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/50 group transition-all"
                        >
                          <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-all">
                            <Plus className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-slate-200 group-hover:text-white">{res.title}</p>
                            <p className="text-xs text-slate-500">{res.subtitle} • {res.type}</p>
                          </div>
                          <ChevronRight className="ml-auto w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Actions Registry */}
                  {query.length < 2 && (
                    <div>
                      <p className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Quick Actions</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                        {SYSTEM_ACTIONS.map((action) => (
                          <button
                            key={action.id}
                            onClick={() => handleAction(undefined, action.handler)}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/50 group transition-all text-left"
                          >
                            <div className="w-8 h-8 rounded-lg bg-slate-800/50 border border-slate-700 flex items-center justify-center text-slate-400 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 group-hover:border-indigo-500/20 transition-all">
                              <action.icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-medium text-slate-300 group-hover:text-white">{action.title}</p>
                            </div>
                            {action.shortcut && (
                              <div className="text-[10px] text-slate-600 font-mono hidden group-hover:block">
                                {action.shortcut}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty State */}
                  {query.length >= 2 && results.length === 0 && !isLoading && (
                    <div className="p-12 text-center text-slate-500">
                      <Search className="w-8 h-8 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-medium">No results found for "{query}"</p>
                      <p className="text-xs mt-1">Try switching to AI Mode for deeper insights.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-700/50 bg-slate-900/50 flex items-center justify-between text-[10px] text-slate-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-400">↵</kbd> Select</span>
                <span className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-400">↑↓</kbd> Navigate</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                Powered by Sentinel Intelligence
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
