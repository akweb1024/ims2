import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { Activity, Search, Filter, ShieldCheck, User } from 'lucide-react';
import AuditLogClient from '@/components/dashboard/super-admin/AuditLogClient';

export const metadata = { title: 'Audit Logs | STM Dashboard' };

export default async function AuditLogsPage() {
    const user = await getSessionUser();
    if (!user || user.role !== 'SUPER_ADMIN') {
        redirect('/dashboard');
    }

    // Fetch latest 200 logs to start with server-side rendering
    const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                }
            }
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-secondary-900 tracking-tight flex items-center gap-3">
                        <ShieldCheck className="text-primary-600" size={32} />
                        System Audit Logs
                    </h1>
                    <p className="text-secondary-500 font-medium mt-1">
                        Global security and activity tracker. All actions are strictly logged for compliance.
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border border-secondary-100">
                    <Activity className="text-primary-500 animate-pulse" size={20} />
                    <span className="text-sm font-bold text-secondary-700">Live Recording Active</span>
                </div>
            </div>

            <AuditLogClient initialLogs={logs} />
        </div>
    );
}
