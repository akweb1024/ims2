import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';

const PRIVILEGED_REIMBURSEMENT_ROLES = new Set([
    'SUPER_ADMIN',
    'ADMIN',
    'HR',
    'HR_MANAGER',
    'FINANCE_ADMIN',
]);

// Employee-safe GET:
// - privileged roles can list company records with filters
// - others can only list their own reimbursement records
export const GET = authorizedRoute([], async (req: NextRequest, user: any) => {
    try {
        const url = new URL(req.url);
        const name = url.searchParams.get('name') || '';
        const employeeId = url.searchParams.get('employeeId') || '';
        const month = url.searchParams.get('month');
        const year = url.searchParams.get('year');
        const isPrivileged = PRIVILEGED_REIMBURSEMENT_ROLES.has(user.role);

        const where: any = {
            ...(month ? { month: parseInt(month, 10) } : {}),
            ...(year ? { year: parseInt(year, 10) } : {}),
        };

        if (isPrivileged) {
            where.user = {
                ...(user?.role !== 'SUPER_ADMIN' && user?.companyId ? { companyId: user.companyId } : {}),
                ...(name ? { name: { contains: name, mode: 'insensitive' } } : {}),
                employeeProfile: employeeId
                    ? { employeeId: { contains: employeeId, mode: 'insensitive' } }
                    : undefined,
            };
        } else {
            where.userId = user.id;
        }

        const records = await prisma.reimbursementRecord.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        company: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        employeeProfile: {
                            select: {
                                employeeId: true,
                                designation: true,
                            }
                        }
                    }
                }
            },
            orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
        });

        const reimbursementIds = records.map((record) => record.id);
        const auditLogs = reimbursementIds.length
            ? await prisma.auditLog.findMany({
                where: {
                    entity: 'REIMBURSEMENT',
                    action: 'UPDATE',
                    entityId: { in: reimbursementIds },
                },
                select: {
                    entityId: true,
                    createdAt: true,
                    changes: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            })
            : [];

        const latestApprovalByRecord = new Map<string, any>();
        for (const log of auditLogs) {
            if (!latestApprovalByRecord.has(log.entityId)) {
                const changes = (log.changes as any) ?? {};
                latestApprovalByRecord.set(log.entityId, {
                    actedAt: log.createdAt,
                    fromStatus: changes?.from?.status ?? null,
                    toStatus: changes?.to?.status ?? null,
                    actedBy: log.user ?? null,
                });
            }
        }

        const enrichedRecords = records.map((record) => ({
            ...record,
            approval: latestApprovalByRecord.get(record.id) ?? null,
        }));

        return NextResponse.json({ data: enrichedRecords });
    } catch (error: any) {
        console.error('HR Reimbursements GET Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
});
