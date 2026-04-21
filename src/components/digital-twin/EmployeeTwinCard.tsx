'use client';

import { useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { EmployeeTwin } from '@/lib/digital-twin/twin-engine';

const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-500/20 text-green-400 border-green-500/40',
    OVERLOADED: 'bg-red-500/20 text-red-400 border-red-500/40',
    OFFLINE_ALERT: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
    OFFLINE: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
    ON_LEAVE: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
};

export const EmployeeTwinCard = ({ 
    employee,
    activeLens = 'LOGISTICS', 
    isHighlighted, 
    onHover, 
    onLeave,
    onDispatch
}: { 
    employee: EmployeeTwin;
    activeLens?: 'LOGISTICS' | 'SALES' | 'SERVICE' | 'EDITORIAL';
    isHighlighted?: boolean;
    onHover?: () => void;
    onLeave?: () => void;
    onDispatch?: () => void;
}) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2) * -8;
        const y = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2) * 8;
        setTilt({ x, y });
    };

    const handleMouseLeave = () => {
        setTilt({ x: 0, y: 0 });
        onLeave?.();
    };

    return (
        <div 
            ref={cardRef}
            onMouseEnter={onHover}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
            style={{ 
                transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                transition: tilt.x === 0 ? 'transform 0.5s ease' : 'transform 0.1s ease'
            }}
            className={`group relative p-6 rounded-2xl transition-all duration-500 shadow-2xl border ${
                employee.isOnLeave 
                    ? 'bg-orange-900/10 border-orange-500/20 opacity-70'
                    : isHighlighted 
                        ? 'bg-indigo-500/20 border-indigo-500 scale-[1.02] z-10 shadow-indigo-500/20' 
                        : 'bg-white/5 border-white/10 hover:border-white/20 hover:shadow-indigo-500/5'
            }`}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-lg text-white transition-all duration-500 ${
                        isHighlighted ? 'bg-indigo-500 scale-110' : 'bg-gradient-to-br from-indigo-500 to-purple-500'
                    }`}>
                        {employee.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-semibold text-white group-hover:text-indigo-300 transition-colors truncate max-w-[150px]">{employee.name}</h3>
                        <p className="text-xs text-white/50">ID: {employee.id.slice(0, 8)}</p>
                    </div>
                </div>
                <Badge className={`${statusColors[employee.status]} border px-3 py-1 font-medium`}>
                    {employee.status}
                </Badge>
            </div>

            <div className="space-y-4">
                <div>
                    <div className="flex justify-between text-xs mb-1 text-white/70">
                        <span>Operational Bandwidth</span>
                        <span>{employee.bandwidth}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-1000 ${
                                isHighlighted ? 'bg-white' : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                            }`}
                            style={{ width: `${employee.bandwidth}%` }}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <div className={`p-2 rounded-xl border transition-all duration-500 ${
                        isHighlighted ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-white/5 border-white/5'
                    }`}>
                        <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
                            {activeLens === 'SALES' ? 'Deals' : activeLens === 'SERVICE' ? 'Tickets' : activeLens === 'EDITORIAL' ? 'Reviews' : 'Tasks'}
                        </p>
                        <p className={`text-lg font-bold transition-colors ${isHighlighted ? 'text-indigo-300' : 'text-white'}`}>
                            {activeLens === 'SALES' ? (employee.activeDealsCount || 0) : activeLens === 'SERVICE' ? (employee.activeTicketsCount || 0) : activeLens === 'EDITORIAL' ? (employee.activeReviewsCount || 0) : employee.taskCount}
                        </p>
                    </div>
                    <div className={`p-2 rounded-xl border transition-all duration-500 ${
                        isHighlighted ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-white/5 border-white/5'
                    }`}>
                        <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Engage</p>
                        <p className={`text-lg font-bold transition-colors ${isHighlighted ? 'text-indigo-300' : 'text-white'}`}>{employee.engagementScore || 0}</p>
                    </div>
                    <div className={`p-2 rounded-xl border transition-all duration-500 ${
                        isHighlighted ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-white/5 border-white/5'
                    }`}>
                        <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Sync</p>
                        <p className="text-[10px] font-medium text-white/80 mt-1">{new Date(employee.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>

                {isHighlighted && (activeLens === 'LOGISTICS' ? employee.linkedInventoryIds.length > 0 : (
                    (activeLens === 'SALES' ? (employee.activeDealsCount||0) : activeLens === 'SERVICE' ? (employee.activeTicketsCount||0) : (employee.activeReviewsCount||0)) > 0
                )) && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-1 duration-300">
                        <p className="text-[9px] uppercase tracking-tighter text-indigo-400 font-bold mb-1">
                            {activeLens === 'LOGISTICS' ? 'Tracking Assets' : activeLens === 'SALES' ? 'Active Deals' : activeLens === 'SERVICE' ? 'Open Tickets' : 'Active Reviews'}
                        </p>
                        <div className="flex gap-1 flex-wrap">
                            {activeLens === 'LOGISTICS' ? (
                                employee.linkedInventoryIds.map(id => (
                                    <div key={id} className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                                ))
                            ) : (
                                Array.from({ length: Math.min(15, activeLens === 'SALES' ? (employee.activeDealsCount||0) : activeLens === 'SERVICE' ? (employee.activeTicketsCount||0) : (employee.activeReviewsCount||0)) }).map((_, idx) => (
                                    <div key={idx} className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* 7-Day Attendance Timeline */}
                <div className="pt-3 border-t border-white/5">
                    <p className="text-[9px] uppercase tracking-tighter text-white/30 font-bold mb-2">7-Day Attendance</p>
                    <div className="flex items-center gap-1">
                        {Array.from({ length: 7 }).map((_, i) => {
                            const d = new Date();
                            d.setDate(d.getDate() - (6 - i));
                            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                            const attended = employee.weeklyAttendance.includes(dateStr);
                            const isToday = i === 6;
                            return (
                                <div key={dateStr} className="flex flex-col items-center gap-1" title={dateStr}>
                                    <div className={`w-5 h-5 rounded-md transition-all duration-300 ${
                                        attended
                                            ? isHighlighted
                                                ? 'bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.7)]'
                                                : 'bg-green-500/70'
                                            : 'bg-white/8 border border-white/5'
                                    } ${isToday ? 'ring-1 ring-white/30' : ''}`} />
                                    <span className="text-[8px] text-white/20">
                                        {['S','M','T','W','T','F','S'][d.getDay()]}
                                    </span>
                                </div>
                            );
                        })}
                        <div className="ml-auto text-right">
                            <p className="text-sm font-bold text-white">{employee.weeklyAttendance.length}<span className="text-white/30 text-[9px]">/7</span></p>
                            <p className="text-[8px] text-white/30">days</p>
                        </div>
                    </div>
                </div>
            </div>
            
            {employee.status === 'ACTIVE' && (
                <span className="absolute top-4 right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
            )}

            {/* Dispatch Button */}
            {onDispatch && !employee.isOnLeave && (
                <button
                    onClick={e => { e.stopPropagation(); onDispatch(); }}
                    className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-[9px] font-bold uppercase tracking-widest text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40"
                >
                    ⚡ Dispatch
                </button>
            )}
        </div>
    );
};
