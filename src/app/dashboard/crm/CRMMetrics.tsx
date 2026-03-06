import { prisma } from '@/lib/prisma';
import { CRMStatCard } from '@/components/crm/CRMPageShell';
import { Target, Briefcase, IndianRupee, Users, TrendingUp, Zap, ShieldCheck, Activity } from 'lucide-react';

export default async function CRMMetrics({ user }: { user: any }) {
    const isGlobal = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(user.role);
    const customerFilter = isGlobal ? {} : { assignedToUserId: user.id };
    const revenueFilter = isGlobal ? {} : {
        subscription: {
            customerProfile: {
                assignedToUserId: user.id
            }
        }
    };

    const [
        totalCustomers,
        newCustomersThisMonth,
        activeLeads,
        pipelineValue,
        revenueData,
        employeeProfile
    ] = await Promise.all([
        prisma.customerProfile.count({
            where: { ...customerFilter, leadStatus: null }
        }),
        prisma.customerProfile.count({
            where: {
                ...customerFilter,
                leadStatus: null,
                createdAt: {
                    gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                }
            }
        }),
        prisma.customerProfile.count({
            where: {
                ...customerFilter,
                leadStatus: {
                    not: null,
                    notIn: ['CONVERTED', 'LOST']
                }
            }
        }),
        prisma.deal.aggregate({
            _sum: { value: true },
            where: {
                ...customerFilter,
                stage: { notIn: ['CLOSED_LOST', 'CLOSED_WON'] }
            }
        }),
        prisma.invoice.aggregate({
            _sum: { total: true },
            where: {
                status: 'PAID',
                ...revenueFilter,
                createdAt: {
                    gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                }
            }
        }),
        prisma.employeeProfile.findUnique({
            where: { userId: user.id }
        })
    ]);

    const currentRevenue = revenueData._sum.total || 0;
    const target = employeeProfile?.monthlyTarget || 0;
    const achievementPercent = target > 0 ? Math.min(Math.round((currentRevenue / target) * 100), 100) : 0;
    const totalPipeline = pipelineValue._sum.value || 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <CRMStatCard
                label="Active Leads"
                value={activeLeads}
                icon={<Target size={22} />}
                accent="bg-primary-950 text-white shadow-primary-100"
                trend={{ value: 'Protocol', label: 'In-flow', isPositive: true }}
            />

            <CRMStatCard
                label="Pipeline Value"
                value={`₹${totalPipeline.toLocaleString()}`}
                icon={<Briefcase size={22} />}
                accent="bg-indigo-900 text-white shadow-indigo-100"
                trend={{ value: 'Projected', label: 'Yield', isPositive: true }}
            />

            <CRMStatCard
                label="Revenue (MTD)"
                value={`₹${currentRevenue.toLocaleString()}`}
                icon={<IndianRupee size={22} />}
                accent="bg-emerald-900 text-white shadow-emerald-100"
                trend={{ value: `${achievementPercent}%`, label: 'Performance', isPositive: achievementPercent >= 100 }}
            >
                <div className="mt-4 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-1000 ${achievementPercent >= 100 ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]' : 'bg-primary-400 shadow-[0_0_12px_rgba(96,165,250,0.6)]'}`}
                        style={{ width: `${achievementPercent}%` }}
                    />
                </div>
            </CRMStatCard>

            <CRMStatCard
                label="Total Customers"
                value={totalCustomers}
                icon={<Users size={22} />}
                accent="bg-secondary-900 text-white shadow-secondary-100"
                trend={{ value: `+${newCustomersThisMonth}`, label: 'Density Growth', isPositive: true }}
            />
        </div>
    );
}
