import { prisma } from '@/lib/prisma';
import { getManagerTeamUserIds, verifyTeamMemberAccess } from '@/lib/team-auth';

/**
 * Get unified attendance view across all team members
 * 
 * @param managerId - The manager's user ID
 * @param params - Filter parameters (month, year, userId, companyId)
 */
export async function getUnifiedAttendance(
    managerId: string,
    params: {
        month: number;
        year: number;
        userId?: string;
        companyId?: string;
    }
) {
    const { month, year, userId, companyId } = params;

    // Get all team member user IDs
    const allowedUserIds = await getManagerTeamUserIds(managerId, companyId);

    // Filter by specific user if provided
    const targetUserIds = userId ? [userId] : allowedUserIds;

    // Verify user has access if specific userId requested
    if (userId && !allowedUserIds.includes(userId)) {
        throw new Error('Forbidden: User not in your team');
    }

    // Build date range for the month in IST
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const istStart = new Date(startDate.getTime() - (330 * 60000));

    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));
    const istEnd = new Date(endDate.getTime() - (330 * 60000));

    const where: any = {
        date: {
            gte: istStart,
            lte: istEnd
        },
        employee: {
            userId: { in: targetUserIds }
        }
    };

    // Get attendance records with company information
    const attendance = await prisma.attendance.findMany({
        where,
        include: {
            employee: {
                select: {
                    id: true,
                    userId: true,
                    user: {
                        select: {
                            name: true,
                            email: true,
                            companyId: true,
                            company: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }
                }
            },
            shift: {
                select: {
                    name: true,
                    startTime: true,
                    endTime: true
                }
            }
        },
        orderBy: [
            { date: 'desc' },
            { employee: { user: { name: 'asc' } } }
        ]
    });

    // Transform response to include company info at top level
    return attendance.map(record => ({
        ...record,
        companyId: record.employee.user.companyId || '',
        companyName: record.employee.user.company?.name || 'Unknown'
    }));
}

/**
 * Get unified leave requests view across all team members
 * 
 * @param managerId - The manager's user ID
 * @param params - Filter parameters (status, userId, companyId)
 */
export async function getUnifiedLeaveRequests(
    managerId: string,
    params: {
        status?: string;
        userId?: string;
        companyId?: string;
    }
) {
    const { status, userId, companyId } = params;

    // Get all team member user IDs
    const allowedUserIds = await getManagerTeamUserIds(managerId, companyId);

    // Filter by specific user if provided
    const targetUserIds = userId ? [userId] : allowedUserIds;

    // Verify user has access if specific userId requested
    if (userId && !allowedUserIds.includes(userId)) {
        throw new Error('Forbidden: User not in your team');
    }

    const where: any = {
        employee: {
            userId: { in: targetUserIds }
        }
    };

    if (status) {
        where.status = status;
    }

    // Get leave requests with company information
    const leaves = await prisma.leaveRequest.findMany({
        where,
        include: {
            employee: {
                select: {
                    id: true,
                    userId: true,
                    user: {
                        select: {
                            name: true,
                            email: true,
                            companyId: true,
                            company: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }
                }
            },
            approvedBy: {
                select: {
                    name: true,
                    email: true
                }
            }
        },
        orderBy: [
            { createdAt: 'desc' }
        ]
    });

    // Transform response to include company name and ID at top level
    return leaves.map(leave => ({
        ...leave,
        companyId: leave.employee.user.companyId || '',
        companyName: leave.employee.user.company?.name || 'Unknown'
    }));
}

/**
 * Get unified work reports view across all team members
 * 
 * @param managerId - The manager's user ID
 * @param params - Filter parameters
 */
export async function getUnifiedWorkReports(
    managerId: string,
    params: {
        startDate?: string;
        endDate?: string;
        userId?: string;
        companyId?: string;
        status?: string;
    }
) {
    const { startDate, endDate, userId, companyId, status } = params;

    // Get all team member user IDs
    const allowedUserIds = await getManagerTeamUserIds(managerId, companyId);

    // Filter by specific user if provided
    const targetUserIds = userId ? [userId] : allowedUserIds;

    // Verify user has access if specific userId requested
    if (userId && !allowedUserIds.includes(userId)) {
        throw new Error('Forbidden: User not in your team');
    }

    const where: any = {
        employee: {
            userId: { in: targetUserIds }
        }
    };

    // Date range filter
    if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate);
        if (endDate) where.date.lte = new Date(endDate);
    }

    // Status filter
    if (status) {
        where.status = status;
    }

    // Get work reports with company information
    const reports = await prisma.workReport.findMany({
        where,
        include: {
            employee: {
                select: {
                    id: true,
                    userId: true,
                    user: {
                        select: {
                            name: true,
                            email: true,
                            companyId: true,
                            company: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }
                }
            },
            comments: {
                include: {
                    author: {
                        select: {
                            name: true,
                            email: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }
        },
        orderBy: [
            { date: 'desc' }
        ]
    });

    // Transform response to include company name at top level
    return reports.map(report => ({
        ...report,
        companyId: report.employee.user.companyId || '',
        companyName: report.employee.user.company?.name || 'Unknown'
    }));
}

/**
 * Get unified performance and KPI data across all team members
 * 
 * @param managerId - The manager's user ID
 * @param params - Filter parameters
 */
export async function getUnifiedPerformance(
    managerId: string,
    params: {
        userId?: string;
        companyId?: string;
        period?: string;
    }
) {
    const { userId, companyId, period } = params;

    // Get all team member user IDs
    const allowedUserIds = await getManagerTeamUserIds(managerId, companyId);

    // Filter by specific user if provided
    const targetUserIds = userId ? [userId] : allowedUserIds;

    // Verify user has access if specific userId requested
    if (userId && !allowedUserIds.includes(userId)) {
        throw new Error('Forbidden: User not in your team');
    }

    // Get users with employee profiles, KPIs, and performance reviews
    const users = await prisma.user.findMany({
        where: {
            id: { in: targetUserIds.filter(id => id !== managerId) } // Exclude manager themselves
        },
        include: {
            company: {
                select: {
                    id: true,
                    name: true
                }
            },
            employeeProfile: {
                select: {
                    id: true,
                    designation: true,
                    kpis: {
                        where: period ? { period } : {},
                        select: {
                            id: true,
                            title: true,
                            target: true,
                            current: true,
                            period: true,
                            category: true,
                            createdAt: true
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 20
                    },
                    performance: {
                        select: {
                            id: true,
                            period: true,
                            rating: true,
                            feedback: true,
                            createdAt: true,
                            reviewer: {
                                select: {
                                    name: true,
                                    email: true
                                }
                            }
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 10
                    },
                    performanceInsights: {
                        select: {
                            id: true,
                            content: true,
                            type: true,
                            date: true
                        },
                        orderBy: { date: 'desc' },
                        take: 10
                    },
                    workReports: {
                        where: {
                            status: 'APPROVED'
                        },
                        select: {
                            id: true,
                            date: true,
                            managerRating: true,
                            selfRating: true
                        },
                        orderBy: { date: 'asc' }, // Ascending for charts
                        take: 30 // Last 30 approved reports
                    }
                }
            }
        }
    });

    // Transform response
    return users.map(u => ({
        userId: u.id,
        userName: u.name,
        userEmail: u.email,
        companyId: u.companyId || '',
        companyName: u.company?.name || 'Unknown',
        kpis: u.employeeProfile?.kpis || [],
        reviews: u.employeeProfile?.performance.map(p => ({
            id: p.id,
            period: p.period,
            rating: p.rating,
            feedback: p.feedback,
            createdAt: p.createdAt,
            reviewer: p.reviewer
        })) || [],
        insights: u.employeeProfile?.performanceInsights || [],
        reportHistory: u.employeeProfile?.workReports.map(r => ({
            date: r.date,
            rating: r.managerRating || r.selfRating || 0,
            type: 'Daily Report'
        })) || []
    }));
}

/**
 * Get unified salary information across all team members
 * 
 * @param managerId - The manager's user ID
 * @param params - Filter parameters
 */
export async function getUnifiedSalaries(
    managerId: string,
    params: {
        userId?: string;
        companyId?: string;
    }
) {
    const { userId, companyId } = params;

    // Get all team member user IDs
    const allowedUserIds = await getManagerTeamUserIds(managerId, companyId);

    // Filter by specific user if provided
    const targetUserIds = userId ? [userId] : allowedUserIds;

    // Verify user has access if specific userId requested
    if (userId && !allowedUserIds.includes(userId)) {
        throw new Error('Forbidden: User not in your team');
    }

    // Get users with employee profiles and increment history
    const users = await prisma.user.findMany({
        where: {
            id: { in: targetUserIds.filter(id => id !== managerId) } // Exclude manager themselves
        },
        include: {
            company: {
                select: {
                    id: true,
                    name: true
                }
            },
            employeeProfile: {
                select: {
                    id: true,
                    employeeId: true,
                    designation: true,
                    baseSalary: true,
                    fixedSalary: true,
                    variableSalary: true,
                    incentiveSalary: true,
                    salaryFixed: true,
                    salaryVariable: true,
                    salaryIncentive: true,
                    lastIncrementDate: true,
                    lastIncrementPercentage: true,
                    incrementHistory: {
                        select: {
                            id: true,
                            effectiveDate: true,
                            oldSalary: true,
                            newSalary: true,
                            oldFixed: true,
                            newFixed: true,
                            status: true
                        },
                        orderBy: { effectiveDate: 'desc' },
                        take: 10
                    }
                }
            }
        }
    });

    // Transform response
    return users.map(u => ({
        userId: u.id,
        userName: u.name,
        userEmail: u.email,
        companyId: u.companyId || '',
        companyName: u.company?.name || 'Unknown',
        employeeProfile: u.employeeProfile ? {
            employeeId: u.employeeProfile.employeeId,
            designation: u.employeeProfile.designation,
            baseSalary: u.employeeProfile.baseSalary,
            fixedSalary: u.employeeProfile.fixedSalary || u.employeeProfile.salaryFixed,
            variableSalary: u.employeeProfile.variableSalary || u.employeeProfile.salaryVariable,
            lastIncrementDate: u.employeeProfile.lastIncrementDate,
            lastIncrementPercentage: u.employeeProfile.lastIncrementPercentage
        } : null,
        incrementHistory: u.employeeProfile?.incrementHistory || []
    }));
}

/**
 * Get detailed profile of a team member for manager view
 * 
 * @param managerId - The manager's user ID
 * @param targetUserId - The team member's user ID
 */
export async function getManagerTeamMemberProfile(managerId: string, targetUserId: string) {
    const hasAccess = await verifyTeamMemberAccess(managerId, targetUserId);

    if (!hasAccess) {
        throw new Error('Forbidden: You do not have access to this user');
    }

    const user = await prisma.user.findUnique({
        where: { id: targetUserId },
        include: {
            company: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
            employeeProfile: {
                include: {
                    incrementHistory: { orderBy: { effectiveDate: 'desc' }, take: 5 },
                    // Recent stats
                    attendance: {
                        take: 30,
                        orderBy: { date: 'desc' }
                    },
                    leaveRequests: {
                        take: 5,
                        orderBy: { createdAt: 'desc' },
                        where: { status: 'PENDING' }
                    },
                    workReports: {
                        take: 5,
                        orderBy: { date: 'desc' }
                    },
                    performance: {
                        take: 3,
                        orderBy: { createdAt: 'desc' }
                    }
                }
            }
        }
    });

    if (!user) return null;

    return {
        ...user,
        companyName: user.company?.name || 'Unknown',
        departmentName: user.department?.name || 'Unassigned',
        // Flatten specific stats for easier consumption
        recentAttendance: user.employeeProfile?.attendance || [],
        pendingLeaves: user.employeeProfile?.leaveRequests || [],
        recentReports: user.employeeProfile?.workReports || [],
        recentReviews: user.employeeProfile?.performance || [],
        incrementHistory: user.employeeProfile?.incrementHistory || []
    };
}

