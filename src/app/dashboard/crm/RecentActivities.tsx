import { prisma } from '@/lib/prisma';
import { formatDistanceToNow } from 'date-fns';
import { 
    MessageSquare, FileText, User, CreditCard, CheckSquare, 
    Settings, History, ArrowRight, UserCheck, Zap,
    Target, Layout, Calendar, Clock
} from 'lucide-react';
import Link from 'next/link';

export default async function RecentActivities({ user }: { user: any }) {
    const isGlobal = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(user.role);
    const whereClause = isGlobal ? {} : { userId: user.id };

    const [comms, audits] = await Promise.all([
        prisma.communicationLog.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            where: whereClause,
            include: {
                customerProfile: {
                    select: { id: true, name: true, organizationName: true }
                },
                user: {
                    select: { name: true }
                }
            }
        }),
        prisma.auditLog.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            where: whereClause,
            include: {
                user: {
                    select: { name: true, role: true }
                }
            }
        })
    ]);

    const activities = [
        ...comms.map(c => ({
            id: c.id,
            type: 'COMMUNICATION',
            title: c.subject || 'Follow-up update',
            detail: c.notes,
            date: c.createdAt,
            user: c.user?.name || 'System',
            icon: <MessageSquare size={14} className="text-primary-400" />,
            meta: (
                <Link href={`/dashboard/customers/${c.customerProfile.id}`} className="hover:text-primary-600 font-black transition-all flex items-center gap-1.5 group/link truncate">
                     <span className="truncate uppercase tracking-tight">{c.customerProfile.name}</span>
                     <ArrowRight size={10} className="group-hover/link:translate-x-0.5 transition-transform" />
                </Link>
            )
        })),
        ...audits.map(a => {
            const icons: Record<string, React.ReactNode> = {
                'Invoice': <FileText size={14} className="text-emerald-400" />,
                'Deal': <Target size={14} className="text-indigo-400" />,
                'CustomerProfile': <User size={14} className="text-secondary-400" />,
                'Subscription': <CreditCard size={14} className="text-amber-400" />,
                'Task': <CheckSquare size={14} className="text-primary-400" />
            };
            const icon = icons[a.entity] || <Settings size={14} className="text-secondary-400" />;
            
            let detail = `${a.entity} was updated.`;
            if (a.changes && typeof a.changes === 'object') {
                const changesObj = a.changes as Record<string, any>;
                const keys = Object.keys(changesObj);
                if (keys.length > 0) {
                    const firstKey = keys[0];
                    const change = changesObj[firstKey];
                    if (change && typeof change === 'object' && 'from' in change && 'to' in change) {
                        detail = `${firstKey.replace(/_/g, ' ')} changed from "${change.from || 'empty'}" to "${change.to || 'empty'}".`;
                    } else {
                        detail = `${keys.length} field(s) were updated on ${a.entity}.`;
                    }
                }
            }

            return {
                id: a.id,
                type: 'AUDIT',
                title: `${a.action.replace(/_/g, ' ')}`,
                detail: detail,
                date: a.createdAt,
                user: a.user?.name || 'System',
                icon: icon,
                meta: (
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-secondary-400 italic flex items-center gap-1.5 whitespace-nowrap">
                        <History size={10} /> {a.entity} activity
                    </span>
                )
            };
        })
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);

    if (activities.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center select-none">
                <div className="w-16 h-16 bg-secondary-50 text-secondary-200 border border-secondary-100/50 rounded-2xl flex items-center justify-center mb-6">
                    <History size={32} strokeWidth={1} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-secondary-300 italic">No recent activity</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {activities.map((activity, idx) => (
                <div key={activity.id} className="group relative flex items-start gap-4 p-5 rounded-[1.5rem] bg-white border border-secondary-50 hover:bg-secondary-50/50 hover:border-secondary-100 transition-all duration-500 shadow-sm hover:shadow-xl hover:shadow-secondary-100/30">
                    <div className="w-11 h-11 rounded-[1.1rem] bg-secondary-50 border border-secondary-100 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:-rotate-3 group-hover:bg-white transition-all duration-700 shadow-inner">
                        {activity.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex justify-between items-start gap-2">
                             <div className="flex flex-col min-w-0">
                                 <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[9px] font-black uppercase tracking-widest text-primary-600/60 flex items-center gap-1">
                                          <Clock size={10} /> {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
                                      </span>
                                 </div>
                                 <h4 className="font-black text-secondary-900 leading-tight group-hover:text-primary-600 transition-colors uppercase tracking-[0.02em] text-[11px] italic truncate">{activity.title}</h4>
                             </div>
                        </div>
                        
                        <p className="text-[10px] text-secondary-500 leading-relaxed font-bold italic border-l-2 border-secondary-100 group-hover:border-primary-200 pl-3 py-1.5 transition-all">
                            &quot;{activity.detail}&quot;
                        </p>
                        
                        <div className="flex items-center justify-between text-[9px] pt-2 mt-1 border-t border-secondary-100/40">
                             <div className="flex-1 min-w-0 pr-4">
                                  {activity.meta}
                             </div>
                             <div className="flex items-center gap-2 font-black text-secondary-300 uppercase tracking-widest whitespace-nowrap bg-secondary-100/40 px-2 py-0.5 rounded-md">
                                 <UserCheck size={10} className="text-secondary-400" />
                                 <span className="truncate max-w-[80px]">{activity.user.split(' ')[0]}</span>
                             </div>
                        </div>
                    </div>
                </div>
            ))}
            
            <div className="mt-6 pt-4 border-t border-secondary-100/50 flex justify-center">
                <Link 
                    href="/dashboard/audit" 
                    className="flex items-center gap-2.5 text-primary-600 hover:text-primary-700 text-[10px] font-black uppercase tracking-[0.3em] italic transition-all group/btn"
                >
                    View full activity log
                    <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                </Link>
            </div>
        </div>
    );
}
