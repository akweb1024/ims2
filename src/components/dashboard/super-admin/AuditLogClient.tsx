'use client';

import { useState } from 'react';
import { Search, Filter, Database, FileText, User as UserIcon, Calendar, ArrowRight, Activity, Eye, ShieldCheck } from 'lucide-react';

interface AuditLogClientProps {
    initialLogs: any[];
}

export default function AuditLogClient({ initialLogs }: AuditLogClientProps) {
    const [logs, setLogs] = useState(initialLogs);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterEntity, setFilterEntity] = useState('ALL');

    const filteredLogs = logs.filter(log => {
        const matchesSearch = 
            log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
            log.entityId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesEntity = filterEntity === 'ALL' || log.entity === filterEntity;
        
        return matchesSearch && matchesEntity;
    });

    const uniqueEntities = Array.from(new Set(logs.map(l => l.entity))).sort();

    const getActionColor = (action: string) => {
        const a = action.toUpperCase();
        if (a.includes('CREATE') || a.includes('ADD') || a.includes('REGISTER')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        if (a.includes('DELETE') || a.includes('REMOVE')) return 'bg-rose-100 text-rose-700 border-rose-200';
        if (a.includes('UPDATE') || a.includes('EDIT')) return 'bg-amber-100 text-amber-700 border-amber-200';
        if (a.includes('LOGIN') || a.includes('AUTH')) return 'bg-purple-100 text-purple-700 border-purple-200';
        return 'bg-secondary-100 text-secondary-700 border-secondary-200';
    };

    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-secondary-200/50 border border-white overflow-hidden">
            {/* Toolbar */}
            <div className="p-6 border-b border-secondary-100 bg-secondary-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by action, user, or ID..."
                        className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl border border-secondary-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all shadow-sm font-medium text-secondary-900"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-48">
                        <Database className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                        <select 
                            className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl border border-secondary-200 focus:ring-2 focus:ring-primary-500 outline-none appearance-none font-medium text-secondary-900 shadow-sm transition-all"
                            value={filterEntity}
                            onChange={(e) => setFilterEntity(e.target.value)}
                        >
                            <option value="ALL">All Entities</option>
                            {uniqueEntities.map(ent => (
                                <option key={ent} value={ent}>{ent}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-secondary-50/80 text-secondary-500 text-xs uppercase tracking-widest font-black">
                            <th className="p-5 font-bold">Timestamp</th>
                            <th className="p-5 font-bold">User</th>
                            <th className="p-5 font-bold">Action</th>
                            <th className="p-5 font-bold">Target Entity</th>
                            <th className="p-5 font-bold">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100/50">
                        {filteredLogs.length > 0 ? (
                            filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-primary-50/30 transition-colors group">
                                    <td className="p-5 align-top">
                                        <div className="flex items-center gap-2 text-sm font-bold text-secondary-900">
                                            <Calendar size={14} className="text-secondary-400" />
                                            {new Date(log.createdAt).toLocaleDateString()}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-medium text-secondary-500 mt-1">
                                            <Activity size={12} className="text-secondary-400" />
                                            {new Date(log.createdAt).toLocaleTimeString()}
                                        </div>
                                        {log.ipAddress && (
                                            <div className="text-[10px] text-secondary-400 font-mono mt-1">
                                                IP: {log.ipAddress}
                                            </div>
                                        )}
                                    </td>
                                    
                                    <td className="p-5 align-top">
                                        {log.user ? (
                                            <div>
                                                <div className="font-bold text-sm text-secondary-900 flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[10px] uppercase font-black">
                                                        {log.user.name?.charAt(0) || '?'}
                                                    </div>
                                                    {log.user.name || log.user.email}
                                                </div>
                                                <div className="text-xs font-medium text-secondary-500 mt-1 bg-secondary-100 inline-block px-2 py-0.5 rounded-md">
                                                    {log.user.role}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary-100 text-secondary-600 font-bold text-xs border border-secondary-200">
                                                <UserIcon size={12} /> System Process
                                            </span>
                                        )}
                                    </td>

                                    <td className="p-5 align-top">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs border ${getActionColor(log.action)}`}>
                                            <Activity size={12} />
                                            {log.action}
                                        </span>
                                    </td>

                                    <td className="p-5 align-top">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black uppercase tracking-wider text-secondary-500 bg-secondary-100 px-2 py-1 rounded-lg">
                                                {log.entity}
                                            </span>
                                        </div>
                                        <div className="text-xs font-mono text-secondary-600 mt-2 flex items-center gap-1 bg-secondary-50 p-1.5 rounded-lg border border-secondary-100 w-max">
                                            ID: {log.entityId}
                                        </div>
                                    </td>

                                    <td className="p-5 align-top">
                                        {log.changes ? (
                                            <details className="cursor-pointer group/details">
                                                <summary className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 list-none">
                                                    <Eye size={14} /> View Payload
                                                    <ArrowRight size={12} className="group-open/details:rotate-90 transition-transform" />
                                                </summary>
                                                <div className="mt-2 p-3 bg-[#0f172a] rounded-xl overflow-x-auto max-w-sm">
                                                    <pre className="text-[10px] font-mono text-[#38bdf8] leading-relaxed">
                                                        {JSON.stringify(log.changes, null, 2)}
                                                    </pre>
                                                </div>
                                            </details>
                                        ) : (
                                            <span className="text-xs font-medium text-secondary-400 italic">No exact payload</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="p-12 text-center text-secondary-500">
                                    <ShieldCheck size={48} className="mx-auto text-secondary-300 mb-4" />
                                    <p className="font-bold text-lg">No audit logs found</p>
                                    <p className="text-sm">Adjust your filters to see more results.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            <div className="p-4 border-t border-secondary-100 bg-secondary-50/50 text-center">
                <p className="text-xs font-bold text-secondary-500 uppercase tracking-widest">
                    Showing latest {filteredLogs.length} activity records
                </p>
            </div>
        </div>
    );
}
