import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { AlertCircle, IndianRupee, Calendar, ArrowRight, UserCheck, MessageSquare, Bell } from 'lucide-react';

export default async function AlertsPanel({ user }: { user: any }) {
    const isGlobal = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(user.role);

    // Filters depend on role
    const invoiceFilter = isGlobal ? {} : {
        subscription: { customerProfile: { assignedToUserId: user.id } }
    };

    const followUpFilter = isGlobal ? {} : { userId: user.id };

    const [overdueInvoices, todaysFollowUps] = await Promise.all([
        prisma.invoice.findMany({
            where: {
                status: 'UNPAID',
                dueDate: { lt: new Date() },
                ...invoiceFilter
            },
            take: 4,
            select: { id: true, invoiceNumber: true, total: true, dueDate: true, subscription: { select: { customerProfile: { select: { name: true } } } } }
        }),
        prisma.communicationLog.findMany({
            where: {
                nextFollowUpDate: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    lt: new Date(new Date().setHours(23, 59, 59, 999))
                },
                isFollowUpCompleted: false,
                ...followUpFilter
            },
            take: 4,
            select: { id: true, subject: true, customerProfile: { select: { name: true, id: true } } }
        })
    ]);

    if (overdueInvoices.length === 0 && todaysFollowUps.length === 0) {
        return (
            <div className="crm-card bg-secondary-50/20 border-secondary-100 overflow-hidden group">
                 <div className="p-8 text-center">
                      <div className="w-16 h-16 bg-white border border-secondary-100 text-secondary-200 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:bg-success-50 group-hover:text-success-500 group-hover:border-success-100 transition-all duration-500 shadow-sm">
                           <Bell size={32} />
                      </div>
                      <p className="text-secondary-400 font-black uppercase tracking-[0.2em] text-[10px]">Matrix Optimized</p>
                      <p className="text-secondary-300 text-[11px] mt-1 italic">No critical alerts pending resolution.</p>
                 </div>
            </div>
        );
    }

    return (
        <div className="crm-card bg-danger-50/5 border-danger-100/50 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                 <AlertCircle size={80} className="text-danger-600" />
            </div>
            
            <div className="p-6 relative z-10">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-2xl bg-danger-100 text-danger-600 flex items-center justify-center shadow-lg shadow-danger-100/50">
                        <AlertCircle size={20} className="animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-danger-700">Critical Intelligence</h3>
                        <p className="text-[10px] text-danger-600/60 font-medium">Resolution required for optimal performance.</p>
                    </div>
                </div>

                <div className="space-y-8">
                    {overdueInvoices.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[9px] font-black text-danger-500 uppercase tracking-widest bg-danger-50 px-3 py-1 rounded-full border border-danger-100">Overdue Phase Invoices</h4>
                                <span className="text-[10px] font-black text-danger-700/60">{overdueInvoices.length} ACTIVE</span>
                            </div>
                            <div className="space-y-2">
                                {overdueInvoices.map(inv => (
                                    <div key={inv.id} className="group relative flex justify-between items-center p-3 rounded-xl bg-white border border-danger-100/60 hover:border-danger-200 hover:shadow-lg hover:shadow-danger-50 hover:-translate-y-0.5 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-danger-50 flex items-center justify-center text-danger-500 shrink-0">
                                                <IndianRupee size={14} />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <Link href={`/dashboard/crm/invoices/${inv.id}`} className="font-bold text-xs text-secondary-900 group-hover:text-danger-600 transition-colors uppercase tracking-tight truncate max-w-[120px]">
                                                    {inv.invoiceNumber}
                                                </Link>
                                                <p className="text-[10px] text-secondary-500 font-medium truncate max-w-[100px]">{inv.subscription?.customerProfile?.name || 'Unmapped'}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end shrink-0 pl-4">
                                            <span className="font-black text-xs text-danger-600">₹{inv.total.toLocaleString()}</span>
                                            <span className="text-[9px] font-bold text-danger-400/60 uppercase">DUE {new Date(inv.dueDate).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {todaysFollowUps.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[9px] font-black text-primary-500 uppercase tracking-widest bg-primary-50 px-3 py-1 rounded-full border border-primary-100">Tasks Reaching Milestone</h4>
                                <span className="text-[10px] font-black text-primary-700/60">{todaysFollowUps.length} DUE</span>
                            </div>
                            <div className="space-y-2">
                                {todaysFollowUps.map(fu => (
                                    <div key={fu.id} className="group relative flex justify-between items-center p-3 rounded-xl bg-white border border-secondary-100/60 hover:border-primary-200 hover:shadow-lg hover:shadow-primary-50 hover:-translate-y-0.5 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-500 shrink-0">
                                                <Calendar size={14} />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <h5 className="font-bold text-xs text-secondary-900 leading-tight uppercase tracking-tight truncate max-w-[140px] group-hover:text-primary-600 transition-colors">
                                                    {fu.subject}
                                                </h5>
                                                <Link href={`/dashboard/customers/${fu.customerProfile.id}`} className="text-[10px] text-secondary-500 font-medium hover:text-primary-600 transition-colors">
                                                    {fu.customerProfile.name}
                                                </Link>
                                            </div>
                                        </div>
                                        <Link href={`/dashboard/customers/${fu.customerProfile.id}?followUpId=${fu.id}`} className="w-8 h-8 bg-primary-600 text-white rounded-lg flex items-center justify-center shadow-lg shadow-primary-100 hover:bg-primary-700 transition-all opacity-0 group-hover:opacity-100">
                                             <ArrowRight size={14} />
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="mt-10 pt-6 border-t border-danger-100/50 flex justify-center">
                    <Link href="/dashboard/follow-ups" className="flex items-center gap-1.5 text-danger-600 hover:text-danger-700 text-[10px] font-black uppercase tracking-widest transition-all hover:gap-2">
                        Resolve Critical Cycles <ArrowRight size={14} />
                    </Link>
                </div>
            </div>
        </div>
    );
}
