
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { History, User, Activity, Clock } from "lucide-react";
import FormattedDate from "@/components/common/FormattedDate";

interface AuditLog {
    id: string;
    action: string;
    entity: string;
    entityId: string;
    createdAt: string;
    user: {
        name: string;
        email: string;
        role: string;
    } | null;
}

export default function AuditLogFeed({ logs }: { logs: AuditLog[] }) {
    return (
        <Card className="border-secondary-200 shadow-sm h-full flex flex-col">
            <CardHeader className="pb-2 border-b border-secondary-100">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-black text-secondary-900 flex items-center gap-2">
                        <History className="text-primary-500" size={20} />
                        Recent Audit Logs
                    </CardTitle>
                    <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest bg-secondary-50 px-2 py-0.5 rounded">
                        Live System Actions
                    </span>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
                {logs.length === 0 ? (
                    <div className="p-8 text-center text-secondary-400">
                        <Activity className="mx-auto mb-2 opacity-20" size={32} />
                        <p className="text-sm">No recent activity found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-secondary-50">
                        {logs.map((log) => (
                            <div key={log.id} className="p-4 hover:bg-secondary-50/50 transition-colors">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 p-1.5 bg-secondary-100 rounded-lg text-secondary-600">
                                        <User size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <p className="text-sm font-bold text-secondary-900 truncate">
                                                {log.user?.name || "System"}
                                            </p>
                                            <span className="text-[10px] font-black text-secondary-400 flex items-center gap-1 shrink-0">
                                                <Clock size={10} />
                                                <FormattedDate date={log.createdAt} />
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="px-1.5 py-0.5 bg-primary-50 text-primary-700 rounded text-[10px] font-black uppercase tracking-tighter">
                                                {log.action}
                                            </span>
                                            <p className="text-xs text-secondary-500 truncate">
                                                on {log.entity} <span className="text-secondary-400 font-mono">[{log.entityId.substring(0, 8)}]</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
            <div className="p-3 bg-secondary-50/80 border-t border-secondary-100 text-center">
                <button className="text-[10px] font-black text-primary-600 hover:text-primary-700 uppercase tracking-widest">
                    View Full Audit History
                </button>
            </div>
        </Card>
    );
}
