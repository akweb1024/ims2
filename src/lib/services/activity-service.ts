import { prisma } from '@/lib/prisma';

export interface ActivityItem {
    id: string;
    type: 'ATTENDANCE' | 'LEAVE' | 'WORK_REPORT' | 'TASK' | 'PERFORMANCE';
    description: string;
    timestamp: Date;
    metadata?: any;
    userId: string;
}

export async function getUserActivity(userId: string, limit = 5): Promise<ActivityItem[]> {
    const activities: ActivityItem[] = [];

    // 1. Attendance (Last 7 days)
    const recentAttendance = await prisma.attendance.findMany({
        where: { employee: { userId } },
        orderBy: { date: 'desc' },
        take: limit,
        select: { id: true, date: true, checkIn: true, checkOut: true, status: true }
    });

    recentAttendance.forEach(a => {
        if (a.checkIn) {
            activities.push({
                id: `att-in-${a.id}`,
                type: 'ATTENDANCE',
                description: `Checked in at ${a.checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                timestamp: a.checkIn,
                userId
            });
        }
        if (a.checkOut) {
            activities.push({
                id: `att-out-${a.id}`,
                type: 'ATTENDANCE',
                description: `Checked out at ${a.checkOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                timestamp: a.checkOut,
                userId
            });
        }
    });

    // 2. Work Reports
    const recentReports = await prisma.workReport.findMany({
        where: { employee: { userId } },
        orderBy: { date: 'desc' },
        take: limit,
        select: { id: true, date: true, tasksCompleted: true, status: true }
    });

    recentReports.forEach(r => {
        activities.push({
            id: `rep-${r.id}`,
            type: 'WORK_REPORT',
            description: `Submitted work report (${r.tasksCompleted} tasks completed)`,
            timestamp: r.date,
            userId
        });
    });

    // 3. Leaves
    const recentLeaves = await prisma.leaveRequest.findMany({
        where: { employee: { userId } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { id: true, type: true, status: true, startDate: true, createdAt: true }
    });

    recentLeaves.forEach(l => {
        activities.push({
            id: `leave-${l.id}`,
            type: 'LEAVE',
            description: `Requested ${l.type} leave (${l.status})`,
            timestamp: l.createdAt,
            userId
        });
    });

    // Sort and limit
    return activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
}

export async function getCompanyActivity(companyId: string, limit = 10): Promise<ActivityItem[]> {
    const activities: ActivityItem[] = [];

    // 1. Recent Attendance (Company wide)
    const recentAttendance = await prisma.attendance.findMany({
        where: { companyId, status: 'PRESENT' },
        orderBy: { date: 'desc' },
        take: limit,
        include: { employee: { select: { user: { select: { name: true, id: true } } } } }
    });

    recentAttendance.forEach(a => {
        if (a.checkIn) {
            activities.push({
                id: `att-in-${a.id}`,
                type: 'ATTENDANCE',
                description: `${a.employee.user.name} checked in`,
                timestamp: a.checkIn,
                userId: a.employee.user.id
            });
        }
    });

    // 2. Recent Work Reports
    const recentReports = await prisma.workReport.findMany({
        where: { companyId },
        orderBy: { date: 'desc' },
        take: limit,
        include: { employee: { select: { user: { select: { name: true, id: true } } } } }
    });

    recentReports.forEach(r => {
        activities.push({
            id: `rep-${r.id}`,
            type: 'WORK_REPORT',
            description: `${r.employee.user.name} submitted work report`,
            timestamp: r.date,
            userId: r.employee.user.id
        });
    });

    // 3. Recent Leaves
    const recentLeaves = await prisma.leaveRequest.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { employee: { select: { user: { select: { name: true, id: true } } } } }
    });

    recentLeaves.forEach(l => {
        activities.push({
            id: `leave-${l.id}`,
            type: 'LEAVE',
            description: `${l.employee.user.name} requested ${l.type} leave`,
            timestamp: l.createdAt,
            userId: l.employee.user.id
        });
    });

    return activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
}

export async function getLastPulse(userId: string): Promise<Date | null> {
    const activities = await getUserActivity(userId, 1);
    return activities.length > 0 ? activities[0].timestamp : null;
}
