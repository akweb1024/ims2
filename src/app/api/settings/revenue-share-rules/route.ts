import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { assertCompanyAccess, canAccessAllCompanies } from '@/lib/access-policy';

const MANAGE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'];

const ruleInclude = {
    beneficiaryDepartment: {
        select: { id: true, name: true, companyId: true, departmentType: true, company: { select: { id: true, name: true } } },
    },
    sourceCompany: { select: { id: true, name: true } },
    sourceDepartment: { select: { id: true, name: true } },
} as const;

/**
 * Cross-company revenue-share rules. A beneficiary (SUPPORT/PRODUCTION) department earns a
 * fixed % of revenue arising in a source company (optionally narrowed to one source dept).
 * Because sharing is cross-company by design, listing/managing is restricted to roles that
 * may operate across companies (SUPER_ADMIN), while company-scoped admins only see/manage
 * rules whose source OR beneficiary sits in a company they can access.
 */
export async function GET(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !MANAGE_ROLES.includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const sourceCompanyId = searchParams.get('sourceCompanyId');
        const beneficiaryDepartmentId = searchParams.get('beneficiaryDepartmentId');
        const includeInactive = searchParams.get('includeInactive') === 'true';

        const where: any = {};
        if (sourceCompanyId) where.sourceCompanyId = sourceCompanyId;
        if (beneficiaryDepartmentId) where.beneficiaryDepartmentId = beneficiaryDepartmentId;
        if (!includeInactive) where.isActive = true;

        // Company-scoped admins: only rules touching a company they can access.
        if (!canAccessAllCompanies(decoded) && decoded.companyId) {
            where.OR = [
                { sourceCompanyId: decoded.companyId },
                { beneficiaryDepartment: { companyId: decoded.companyId } },
            ];
        }

        const rules = await prisma.revenueShareRule.findMany({
            where,
            include: ruleInclude,
            orderBy: [{ sourceCompanyId: 'asc' }, { createdAt: 'desc' }],
        });

        return NextResponse.json(rules);
    } catch (error: any) {
        console.error('Fetch RevenueShareRules Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

interface RuleInput {
    beneficiaryDepartmentId: string;
    sourceCompanyId: string;
    sourceDepartmentId?: string | null;
    percentage: number;
    effectiveFrom?: string | null;
    effectiveTo?: string | null;
    note?: string | null;
}

async function validateRule(decoded: any, input: RuleInput) {
    if (!input.beneficiaryDepartmentId || !input.sourceCompanyId) {
        return 'beneficiaryDepartmentId and sourceCompanyId are required';
    }
    const pct = Number(input.percentage);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        return 'percentage must be between 0 and 100';
    }
    if (input.effectiveFrom && input.effectiveTo && new Date(input.effectiveTo) < new Date(input.effectiveFrom)) {
        return 'effectiveTo cannot be before effectiveFrom';
    }

    // Beneficiary must exist; source dept (if any) must belong to the source company.
    const beneficiary = await prisma.department.findUnique({
        where: { id: input.beneficiaryDepartmentId },
        select: { id: true, companyId: true },
    });
    if (!beneficiary) return 'Beneficiary department not found';

    if (input.sourceDepartmentId) {
        const src = await prisma.department.findUnique({
            where: { id: input.sourceDepartmentId },
            select: { id: true, companyId: true },
        });
        if (!src) return 'Source department not found';
        if (src.companyId !== input.sourceCompanyId) {
            return 'Source department does not belong to the source company';
        }
    }

    // Caller must be able to act on both sides (cross-company allowed only for global roles).
    await assertCompanyAccess(decoded, input.sourceCompanyId, 'create a revenue-share rule sourced from this company');
    await assertCompanyAccess(decoded, beneficiary.companyId, 'create a revenue-share rule for this beneficiary department');
    return null;
}

export async function POST(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !MANAGE_ROLES.includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const inputs: RuleInput[] = Array.isArray(body?.rules) ? body.rules : [body];

        const created = [];
        for (const input of inputs) {
            const err = await validateRule(decoded, input);
            if (err) return NextResponse.json({ error: err }, { status: 400 });

            const rule = await prisma.revenueShareRule.create({
                data: {
                    beneficiaryDepartmentId: input.beneficiaryDepartmentId,
                    sourceCompanyId: input.sourceCompanyId,
                    sourceDepartmentId: input.sourceDepartmentId || null,
                    percentage: Number(input.percentage),
                    effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : undefined,
                    effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
                    note: input.note || null,
                },
                include: ruleInclude,
            });
            created.push(rule);

            await prisma.auditLog.create({
                data: {
                    userId: decoded.id,
                    action: 'create',
                    entity: 'revenueShareRule',
                    entityId: rule.id,
                    changes: JSON.stringify(input),
                },
            });
        }

        return NextResponse.json(created.length === 1 ? created[0] : created, { status: 201 });
    } catch (error: any) {
        console.error('Create RevenueShareRule Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !MANAGE_ROLES.includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { id, percentage, effectiveFrom, effectiveTo, isActive, note } = body;
        if (!id) return NextResponse.json({ error: 'Rule ID required' }, { status: 400 });

        const existing = await prisma.revenueShareRule.findUnique({
            where: { id },
            include: { beneficiaryDepartment: { select: { companyId: true } } },
        });
        if (!existing) return NextResponse.json({ error: 'Rule not found' }, { status: 404 });

        await assertCompanyAccess(decoded, existing.sourceCompanyId, 'edit this revenue-share rule');

        if (percentage !== undefined) {
            const pct = Number(percentage);
            if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
                return NextResponse.json({ error: 'percentage must be between 0 and 100' }, { status: 400 });
            }
        }

        const rule = await prisma.revenueShareRule.update({
            where: { id },
            data: {
                ...(percentage !== undefined && { percentage: Number(percentage) }),
                ...(effectiveFrom !== undefined && { effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : undefined }),
                ...(effectiveTo !== undefined && { effectiveTo: effectiveTo ? new Date(effectiveTo) : null }),
                ...(isActive !== undefined && { isActive }),
                ...(note !== undefined && { note }),
            },
            include: ruleInclude,
        });

        await prisma.auditLog.create({
            data: {
                userId: decoded.id,
                action: 'update',
                entity: 'revenueShareRule',
                entityId: id,
                changes: JSON.stringify(body),
            },
        });

        return NextResponse.json(rule);
    } catch (error: any) {
        console.error('Update RevenueShareRule Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const decoded = await getAuthenticatedUser();
        if (!decoded || !MANAGE_ROLES.includes(decoded.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Rule ID required' }, { status: 400 });

        const existing = await prisma.revenueShareRule.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
        await assertCompanyAccess(decoded, existing.sourceCompanyId, 'delete this revenue-share rule');

        // Soft-delete to preserve the audit trail behind already-computed shares.
        await prisma.revenueShareRule.update({ where: { id }, data: { isActive: false } });

        await prisma.auditLog.create({
            data: {
                userId: decoded.id,
                action: 'deactivate',
                entity: 'revenueShareRule',
                entityId: id,
                changes: JSON.stringify({ isActive: false }),
            },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete RevenueShareRule Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
