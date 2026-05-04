import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createAuditLog } from '@/lib/notifications';

const ALLOWED_STATUS = new Set(['SUBMITTED', 'APPROVED', 'PAID']);

export const PATCH = authorizedRoute(['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'FINANCE_ADMIN'], async (req: NextRequest, user: any, context: any) => {
    try {
        const id = context?.params?.id as string | undefined;
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        const body = await req.json();
        const nextStatus = body?.status ? String(body.status).toUpperCase() : '';
        if (!ALLOWED_STATUS.has(nextStatus)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const record = await prisma.reimbursementRecord.findFirst({
            where: { id },
            include: {
                user: { select: { id: true, companyId: true } },
            },
        });

        if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

        if (user.role !== 'SUPER_ADMIN' && user.companyId && record.user?.companyId && record.user.companyId !== user.companyId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const updated = await prisma.reimbursementRecord.update({
            where: { id: record.id },
            data: { status: nextStatus },
        });

        await createAuditLog({
            userId: user.id,
            action: 'UPDATE',
            entity: 'REIMBURSEMENT',
            entityId: record.id,
            changes: {
                from: { status: record.status },
                to: { status: updated.status },
                month: record.month,
                year: record.year,
                recordUserId: record.userId,
            },
            ipAddress: req.headers.get('x-forwarded-for') || 'API',
        });

        return NextResponse.json({ data: updated });
    } catch (error: any) {
        console.error('HR Reimbursements PATCH Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
});
