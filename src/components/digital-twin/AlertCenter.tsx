'use client';

import { EmployeeTwin, InventoryTwin, TwinSummary } from '@/lib/digital-twin/twin-engine';

interface AlertCenterProps {
    employees: EmployeeTwin[];
    inventory: InventoryTwin[];
    summary: TwinSummary;
    onDispatch: (employeeId?: string, itemId?: string) => void;
    isOpen: boolean;
    onToggle: () => void;
}

const AlertItem = ({ 
    type, label, badge, sublabel, color, onClick 
}: { 
    type: 'employee' | 'inventory'; 
    label: string; 
    badge: string; 
    sublabel: string; 
    color: string;
    onClick: () => void;
}) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-between p-3 rounded-xl border border-white/5 hover:border-${color}-500/30 bg-white/3 hover:bg-${color}-500/5 transition-all duration-200 text-left group`}
    >
        <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full bg-${color}-500 animate-pulse shrink-0`} />
            <div>
                <p className="text-sm font-semibold text-white truncate max-w-[160px]">{label}</p>
                <p className="text-[10px] text-white/40">{sublabel}</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full bg-${color}-500/20 text-${color}-400 border border-${color}-500/30`}>
                {badge}
            </span>
            <span className="text-white/20 group-hover:text-white/50 transition-colors text-xs">⚡</span>
        </div>
    </button>
);

export const AlertCenter = ({ 
    employees, 
    inventory, 
    summary, 
    onDispatch, 
    isOpen, 
    onToggle 
}: AlertCenterProps) => {
    const alertEmployees = employees.filter(e => ['OVERLOADED', 'OFFLINE_ALERT'].includes(e.status));
    const alertInventory = inventory.filter(i => ['CRITICAL', 'WARNING'].includes(i.status));
    const totalAlerts = alertEmployees.length + alertInventory.length;

    const alertColorMap: Record<string, string> = {
        OVERLOADED: 'red',
        OFFLINE_ALERT: 'yellow',
        CRITICAL: 'red',
        WARNING: 'yellow',
    };

    return (
        <div className={`fixed right-0 top-0 h-full z-40 transition-all duration-500 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            {/* Toggle Button */}
            <button
                onClick={onToggle}
                className="absolute -left-12 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 py-4 px-3 bg-[#0a0a0a] border border-white/10 rounded-l-xl hover:border-indigo-500/50 transition-all duration-200 group"
            >
                <span className="text-white/30 group-hover:text-white/70 text-sm transition-colors">
                    {isOpen ? '→' : '←'}
                </span>
                {totalAlerts > 0 && (
                    <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                        {totalAlerts > 9 ? '9+' : totalAlerts}
                    </span>
                )}
                <span className="text-[8px] text-white/20 uppercase tracking-widest rotate-180" style={{ writingMode: 'vertical-rl' }}>Alerts</span>
            </button>

            {/* Panel */}
            <div className="h-full w-80 bg-[#080808] border-l border-white/8 flex flex-col">
                <div className="p-5 border-b border-white/5">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-red-500/50 via-yellow-500/50 to-transparent" />
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <h3 className="text-sm font-black uppercase tracking-widest text-white">Alert Center</h3>
                    </div>
                    <p className="text-[10px] text-white/30">{totalAlerts} active alerts require attention</p>
                </div>

                {totalAlerts === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
                        <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-2xl">✓</div>
                        <div>
                            <p className="text-sm font-semibold text-green-400">All Systems Nominal</p>
                            <p className="text-xs text-white/30 mt-1">No alerts detected across {employees.length + inventory.length} nodes</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {alertEmployees.length > 0 && (
                            <div>
                                <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2 px-1">Personnel Alerts</p>
                                <div className="space-y-1.5">
                                    {alertEmployees.map(emp => (
                                        <AlertItem
                                            key={emp.id}
                                            type="employee"
                                            label={emp.name}
                                            badge={emp.status.replace('_', ' ')}
                                            sublabel={`${emp.taskCount} tasks · Low bandwidth`}
                                            color={alertColorMap[emp.status] || 'yellow'}
                                            onClick={() => onDispatch(emp.id, undefined)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {alertInventory.length > 0 && (
                            <div>
                                <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2 px-1">Asset Alerts</p>
                                <div className="space-y-1.5">
                                    {alertInventory.map(item => (
                                        <AlertItem
                                            key={item.id}
                                            type="inventory"
                                            label={item.name}
                                            badge={item.status}
                                            sublabel={`${item.quantity} units · Min: ${item.minLevel}`}
                                            color={alertColorMap[item.status] || 'yellow'}
                                            onClick={() => onDispatch(undefined, item.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Summary Footer */}
                <div className="p-4 border-t border-white/5 grid grid-cols-2 gap-2">
                    <div className="p-2 bg-white/3 rounded-lg text-center">
                        <p className="text-lg font-black text-green-400">{summary.activeEmployees}</p>
                        <p className="text-[9px] text-white/30 uppercase tracking-wider">Active</p>
                    </div>
                    <div className="p-2 bg-white/3 rounded-lg text-center">
                        <p className="text-lg font-black text-red-400">{summary.criticalItems}</p>
                        <p className="text-[9px] text-white/30 uppercase tracking-wider">Critical</p>
                    </div>
                    <div className="p-2 bg-white/3 rounded-lg text-center">
                        <p className="text-lg font-black text-indigo-400">{summary.activeThreads}</p>
                        <p className="text-[9px] text-white/30 uppercase tracking-wider">Threads</p>
                    </div>
                    <div className="p-2 bg-white/3 rounded-lg text-center">
                        <p className="text-lg font-black text-yellow-400">{summary.warningItems}</p>
                        <p className="text-[9px] text-white/30 uppercase tracking-wider">Warning</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
