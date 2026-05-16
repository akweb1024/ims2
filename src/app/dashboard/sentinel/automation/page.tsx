import React from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { AutomationBuilder } from '@/components/sentinel/AutomationBuilder';
import { Cpu, Zap, Activity } from 'lucide-react';

const stats = [
  { label: 'Active Rules', value: '12', icon: Activity, iconWrap: 'bg-emerald-500/10', iconColor: 'text-emerald-400' },
  { label: 'System Uptime', value: '99.9%', icon: Cpu, iconWrap: 'bg-indigo-500/10', iconColor: 'text-indigo-400' },
  { label: 'Events Handled', value: '2.4k', icon: Zap, iconWrap: 'bg-amber-500/10', iconColor: 'text-amber-400' },
];

export default function AutomationPage() {
  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto space-y-12">
        {/* Header Section */}
        <header className="relative py-12 px-8 rounded-[40px] bg-gradient-to-br from-indigo-950 via-slate-900 to-black overflow-hidden border border-indigo-500/10">
          <div className="absolute top-0 right-0 p-12 opacity-10">
            <Cpu className="w-64 h-64 text-indigo-500 animate-pulse" />
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2 text-indigo-400 font-bold tracking-[0.2em] uppercase text-xs">
              <Zap className="w-4 h-4 fill-current" />
              Autonomous Engine
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter">
              Sentinel <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Automations</span>
            </h1>
            <p className="max-w-2xl text-slate-400 text-lg leading-relaxed">
              Define the logic that powers your Digital Twin. Automate response protocols,
              anomaly mitigations, and cross-module communications with high-fidelity TCA rules.
            </p>
          </div>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="p-6 bg-slate-900/50 border border-slate-800 rounded-[32px] flex items-center gap-6">
              <div className={`p-4 ${stat.iconWrap} rounded-2xl`}>
                <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-black text-white">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Builder Section */}
        <section>
          <AutomationBuilder />
        </section>
      </div>
    </DashboardLayout>
  );
}
