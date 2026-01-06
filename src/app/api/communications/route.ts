import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        // 1. Verify Authentication
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'SALES_EXECUTIVE', 'MANAGER', 'FINANCE_ADMIN'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. Parse Body
        const body = await req.json();
        const {
            customerProfileId,
            channel,
            type, // EMAIL, CALL, COMMENT, etc.
            subject,
            notes,
            outcome,
            nextFollowUpDate,
            duration,
            recordingUrl,
            referenceId,
            previousFollowUpId
        } = body;

        if (!customerProfileId || !channel || !subject || !notes) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 3. Create Log
        const log = await prisma.communicationLog.create({
            data: {
                customerProfileId,
                userId: decoded.id,
                channel,
                type: type || 'COMMENT',
                subject,
                notes,
                outcome,
                duration,
                recordingUrl,
                referenceId,
                nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
                date: new Date()
            }
        });

        // 4. If this is a response to a follow-up, mark the previous one as completed
        if (previousFollowUpId) {
            await prisma.communicationLog.update({
                where: { id: previousFollowUpId },
                data: { isFollowUpCompleted: true }
            });
        }

        // 4. Log Audit
        await prisma.auditLog.create({
            data: {
                userId: decoded.id,
                action: 'create',
                entity: 'communication_log',
                entityId: log.id,
                changes: JSON.stringify(body)
            }
        });

        return NextResponse.json(log);

    } catch (error: any) {
        console.error('Communication Log Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !['SUPER_ADMIN', 'MANAGER', 'SALES_EXECUTIVE'].includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        // Build where clause based on hierarchy and multi-tenancy
        const userCompanyId = decoded.companyId;
        const where: any = {};

        // Restrict to company if not SUPER_ADMIN
        if (decoded.role !== 'SUPER_ADMIN' && userCompanyId) {
            where.companyId = userCompanyId;
        }

        if (decoded.role === 'SALES_EXECUTIVE') {
            // Executives see logs they created OR logs for customers assigned to them (directly or via team)
            where.OR = [
                { userId: decoded.id },
                {
                    customerProfile: {
                        OR: [
                            { assignedToUserId: decoded.id },
                            { assignedExecutives: { some: { id: decoded.id } } }
                        ]
                    }
                }
            ];
        } else if (decoded.role === 'MANAGER') {
            // Managers see everything in their team/company
            where.OR = [
                { userId: decoded.id },
                { user: { managerId: decoded.id } }, // Logs by subordinates
                {
                    customerProfile: {
                        OR: [
                            { assignedTo: { managerId: decoded.id } },
                            { assignedExecutives: { some: { managerId: decoded.id } } }
                        ]
                    }
                }
            ];
        }
        // SUPER_ADMIN sees everything (empty where)

        const [logs, total] = await Promise.all([
            prisma.communicationLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { date: 'desc' },
                include: {
                    customerProfile: {
                        select: { name: true, organizationName: true, customerType: true }
                    },
                    user: {
                        select: { id: true, email: true, role: true }
                    }
                }
            }),
            prisma.communicationLog.count({ where })
        ]);

        // Apply restricted visibility for SALES_EXECUTIVE
        const processedLogs = logs.map(log => {
            if (decoded.role === 'SALES_EXECUTIVE' && log.userId !== decoded.id) {
                return {
                    ...log,
                    notes: '*** Restricted ***',
                    subject: '*** Restricted ***',
                    // Keep date and outcome (status)
                };
            }
            return log;
        });

        return NextResponse.json({
            data: processedLogs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error: any) {
        console.error('Fetch Communications Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
