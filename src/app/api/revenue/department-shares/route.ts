import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { canAccessAllCompanies } from '@/lib/access-policy';
import { getDepartmentShareReport, lockPeriod } from '@/lib/revenue-share-report';
import { prisma } from '@/lib/prisma';

const VIEW_ROLES = ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'MANAGER'];
const LOCK_ROLES = ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'];

function resolveMonthYear(searchParams: URLSearchParams) {
    const now = new Date();
    const month = Number(searchParams.get('month')) || now.getUTCMonth() + 1;
    const year = Number(searchParams.get('year')) || now.getUTCFullYear();
    return { month, year };
}

/**
 * Internal revenue-share P&L for a month. Company-scoped admins are pinned to their own
 * company; only roles that may operate across companies can pass an arbitrary companyId
 * (and omit it to see every company).
 */
export async function GET(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !VIEW_ROLES.includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const { month, year } = resolveMonthYear(searchParams);

        const requested = searchParams.get('companyId');
        const companyId = canAccessAllCompanies(decoded)
            ? requested || null
            : decoded.companyId || null;

        const report = await getDepartmentShareReport({ companyId, month, year });
        return NextResponse.json(report);
    } catch (error: any) {
        console.error('DepartmentShareReport Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !LOCK_ROLES.includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        if (body?.action !== 'lock') {
            return NextResponse.json({ error: "Unsupported action (expected 'lock')" }, { status: 400 });
        }
        const month = Number(body.month);
        const year = Number(body.year);
        if (!month || month < 1 || month > 12 || !year) {
            return NextResponse.json({ error: 'Valid month (1-12) and year are required' }, { status: 400 });
        }

        const locked = await lockPeriod(month, year);

        await prisma.auditLog.create({
            data: {
                userId: decoded.id,
                action: 'lock-period',
                entity: 'departmentRevenueShare',
                entityId: `${year}-${String(month).padStart(2, '0')}`,
                changes: JSON.stringify({ month, year, lockedRows: locked }),
            },
        });

        return NextResponse.json({ success: true, lockedRows: locked });
    } catch (error: any) {
        console.error('LockPeriod Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
