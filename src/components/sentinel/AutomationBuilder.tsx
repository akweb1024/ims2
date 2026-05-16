'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Zap,
  Settings,
  Trash2,
  Play,
  Box,
  AlertTriangle,
  Mail,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

interface Rule {
  id: string;
  name: string;
  trigger: string;
  condition: string;
  action: string;
  isActive: boolean;
}

const TRIGGERS = [
  { id: 'STOCK_LOW', label: 'Inventory Level Low', icon: Box, description: 'Triggers when an item drops below min level' },
  { id: 'FINANCE_LARGE', label: 'Large Transaction', icon: Zap, description: 'Triggers on entries > 50,000 INR' },
  { id: 'HEALTH_DROP', label: 'System Health Drop', icon: AlertTriangle, description: 'Triggers if health score < 70%' },
];

const ACTIONS = [
  { id: 'NOTIFY_ADMIN', label: 'Notify Administrator', icon: Mail },
  { id: 'CREATE_TASK', label: 'Generate Recovery Task', icon: Plus },
  { id: 'LOG_EVENT', label: 'Log Security Audit', icon: CheckCircle2 },
];

export const AutomationBuilder: React.FC = () => {
  const [rules, setRules] = useState<Rule[]>([
    { id: '1', name: 'Auto-Restock Alert', trigger: 'STOCK_LOW', condition: '< 10', action: 'NOTIFY_ADMIN', isActive: true }
  ]);
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Sentinel Automation</h2>
          <p className="text-slate-400 text-sm">Configure autonomous system reactions and logic-driven workflows.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl flex items-center gap-2 font-medium transition-colors shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          Create New Rule
        </motion.button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {rules.map((rule) => (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group relative p-6 bg-slate-900/50 border border-slate-800 rounded-3xl hover:border-indigo-500/50 transition-all duration-300 backdrop-blur-xl"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${rule.isActive ? 'bg-indigo-500/10' : 'bg-slate-800/50'}`}>
                  <Zap className={`w-6 h-6 ${rule.isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                </div>
                <div className="flex gap-2">
                  <button className="p-2 text-slate-500 hover:text-white transition-colors">
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setRules(rules.filter(r => r.id !== rule.id))}
                    className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-bold text-white mb-1">{rule.name}</h3>
              <p className="text-xs text-slate-500 mb-6">Runs autonomously when conditions met</p>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-2xl border border-slate-800/50">
                  <div className="w-2 h-2 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50" />
                  <span className="text-xs text-slate-300 font-medium">{TRIGGERS.find(t => t.id === rule.trigger)?.label}</span>
                </div>
                <div className="flex justify-center">
                  <ChevronRight className="w-4 h-4 text-slate-600 rotate-90" />
                </div>
                <div className="flex items-center gap-3 p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/50" />
                  <span className="text-xs text-indigo-300 font-bold">{ACTIONS.find(a => a.id === rule.action)?.label}</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-800 flex justify-between items-center">
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${rule.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                  {rule.isActive ? 'ACTIVE' : 'PAUSED'}
                </span>
                <button className="text-xs font-bold text-indigo-400 flex items-center gap-1 hover:text-indigo-300">
                  <Play className="w-3 h-3 fill-current" />
                  Test Rule
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {rules.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800 rounded-3xl">
          <Box className="w-12 h-12 text-slate-700 mb-4" />
          <p className="text-slate-500 font-medium">No automation rules created yet.</p>
          <button onClick={() => setIsAdding(true)} className="mt-4 text-indigo-400 text-sm font-bold hover:underline">
            Click here to start
          </button>
        </div>
      )}
    </div>
  );
};
