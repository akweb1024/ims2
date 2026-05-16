import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getISTToday, formatToISTDate } from '@/lib/date-utils';
import { getWhatsAppReportRecipients, sendWhatsApp } from '@/lib/whatsapp';
import { Prisma } from '@prisma/client';
import { validateCronRequest } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';

type DigestSlot = '0930' | '1100' | '1730' | '1830';

const SLOT_CONFIG: Record<DigestSlot, { label: string; metrics: Array<'present' | 'absent' | 'late' | 'leftOffice' | 'workReportsSubmitted'> }> = {
    '0930': { label: '09:30 AM', metrics: ['present', 'absent'] },
    '1100': { label: '11:00 AM', metrics: ['present', 'absent', 'late'] },
    '1730': { label: '05:30 PM', metrics: ['present', 'absent', 'leftOffice'] },
    '1830': { label: '06:30 PM', metrics: ['present', 'absent', 'workReportsSubmitted', 'leftOffice'] },
};

const METRIC_LABELS: Record<string, string> = {
    present: 'Present',
    absent: 'Absent',
    late: 'Late',
    leftOffice: 'Left Office',
    workReportsSubmitted: 'Work Report Submitted'
};

function isDigestSlot(value: string): value is DigestSlot {
    return value in SLOT_CONFIG;
}

export async function GET(req: NextRequest) {
    try {
        const cronAuthError = validateCronRequest(req);
        if (cronAuthError) return cronAuthError;

        const { searchParams } = new URL(req.url);
        const slotParam = String(searchParams.get('slot') || '');
        if (!isDigestSlot(slotParam)) {
            return NextResponse.json({ error: 'Invalid slot. Use one of: 0930,1100,1730,1830' }, { status: 400 });
        }

        const slot = slotParam as DigestSlot;
        const slotMeta = SLOT_CONFIG[slot];
        const todayStart = getISTToday();
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);
        const todayLabel = formatToISTDate(todayStart);

        const companies = await prisma.company.findMany({
            select: { id: true, name: true }
        });

        const summaries: Array<Record<string, unknown>> = [];

        for (const company of companies) {
            const recipients = await getWhatsAppReportRecipients(company.id);
            if (recipients.length === 0) {
                summaries.push({
                    companyId: company.id,
                    companyName: company.name,
                    status: 'skipped',
                    reason: 'No recipients configured',
                });
                continue;
            }

            const profiles = await prisma.employeeProfile.findMany({
                where: {
                    user: {
                        companyId: company.id,
                        isActive: true
                    }
                },
                select: { id: true }
            });
            const employeeIds = profiles.map((p) => p.id);
            const totalEmployees = employeeIds.length;

            const [attendanceRows, onLeaveCount, workReportRows] = await Promise.all([
                employeeIds.length > 0
                    ? prisma.attendance.findMany({
                        where: {
                            companyId: company.id,
                            employeeId: { in: employeeIds },
                            date: { gte: todayStart, lt: todayEnd }
                        },
                        select: {
                            employeeId: true,
                            checkIn: true,
                            checkOut: true,
                            isLate: true,
                            lateMinutes: true
                        }
                    })
                    : Promise.resolve([]),
                employeeIds.length > 0
                    ? prisma.leaveRequest.count({
                        where: {
                            companyId: company.id,
                            employeeId: { in: employeeIds },
                            status: 'APPROVED',
                            startDate: { lte: todayStart },
                            endDate: { gte: todayStart }
                        }
                    })
                    : Promise.resolve(0),
                slotMeta.metrics.includes('workReportsSubmitted') && employeeIds.length > 0
                    ? prisma.workReport.findMany({
                        where: {
                            companyId: company.id,
                            employeeId: { in: employeeIds },
                            date: { gte: todayStart, lt: todayEnd }
                        },
                        select: { employeeId: true }
                    })
                    : Promise.resolve([]),
            ]);

            const present = attendanceRows.filter((row) => row.checkIn && !row.checkOut).length;
            const leftOffice = attendanceRows.filter((row) => !!row.checkOut).length;
            const late = attendanceRows.filter((row) => row.checkIn && (row.isLate || (row.lateMinutes || 0) > 0)).length;
            const absent = Math.max(0, totalEmployees - present - leftOffice - onLeaveCount);
            const workReportsSubmitted = new Set(workReportRows.map((row) => row.employeeId)).size;

            const metricValues: Record<string, number> = {
                present,
                absent,
                late,
                leftOffice,
                workReportsSubmitted
            };

            const messageLines = [
                `*Attendance Snapshot*`,
                `Company: ${company.name}`,
                `Date: ${todayLabel}`,
                `Time: ${slotMeta.label} IST`,
                ''
            ];
            for (const metric of slotMeta.metrics) {
                messageLines.push(`• ${METRIC_LABELS[metric]}: ${metricValues[metric]}`);
            }

            const message = messageLines.join('\n');
            let sent = 0;
            let failed = 0;
            const failures: string[] = [];

            for (const recipient of recipients) {
                const res = await sendWhatsApp({
                    to: recipient,
                    message,
                    companyId: company.id
                });
                if (res.success) {
                    sent += 1;
                } else {
                    failed += 1;
                    failures.push(`${recipient}: ${res.error || 'send_failed'}`);
                }
            }

            summaries.push({
                companyId: company.id,
                companyName: company.name,
                slot,
                recipients: recipients.length,
                sent,
                failed,
                metrics: metricValues,
                failures
            });
        }

        const auditChanges = {
            slot,
            date: todayLabel,
            companiesProcessed: companies.length,
            summaries
        } as unknown as Prisma.InputJsonValue;

        await prisma.auditLog.create({
            data: {
                action: 'ATTENDANCE_WHATSAPP_DIGEST_CRON',
                entity: 'attendance_whatsapp_digest',
                entityId: `slot:${slot}`,
                ipAddress: 'SYSTEM',
                changes: auditChanges
            }
        });

        return NextResponse.json({
            success: true,
            slot,
            date: todayLabel,
            companiesProcessed: companies.length,
            summaries
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || 'Failed to run attendance WhatsApp digest cron' },
            { status: 500 }
        );
    }
}
