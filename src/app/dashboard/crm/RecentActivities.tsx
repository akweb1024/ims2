import { prisma } from '@/lib/prisma';
import { formatDistanceToNow } from 'date-fns';

export default async function RecentActivities({ user }: { user: any }) {
    const isGlobal = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(user.role);

    // Filter activities where the log is created by the user OR the customer is assigned to the user
    // For simplicity in V1, we filter by who performed the action (userId) for non-admins.
    const whereClause = isGlobal ? {} : { userId: user.id };

    const activities = await prisma.communicationLog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        where: whereClause,
        include: {
            customerProfile: {
                select: { name: true, organizationName: true }
            },
            user: {
                select: { name: true }
            }
        }
    });

    if (activities.length === 0) {
        return <div className="text-sm text-secondary-500 italic p-4">No recent activities found.</div>;
    }

    return (
        <ul className="space-y-4">
            {activities.map((activity) => (
                <li key={activity.id} className="flex flex-col space-y-1 border-b border-secondary-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start">
                        <span className="font-bold text-sm text-secondary-900">
                            {activity.subject || 'Interaction'}
                        </span>
                        <span className="text-xs text-secondary-400 whitespace-nowrap">
                            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                        </span>
                    </div>
                    <p className="text-xs text-secondary-600 line-clamp-2">
                        {activity.notes || 'No details provided.'}
                    </p>
                    <div className="flex justify-between items-center text-[10px] text-secondary-400 mt-1">
                        <span>
                            👤 {activity.customerProfile.name} ({activity.customerProfile.organizationName})
                        </span>
                        <span>
                            By: {activity.user?.name || 'System'}
                        </span>
                    </div>
                </li>
            ))}
        </ul>
    );
}
