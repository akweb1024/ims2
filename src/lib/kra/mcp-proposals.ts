/**
 * MCP write-action proposals — the two-layer approval gate for the ims2 MCP
 * server (scripts/mcp-server.ts).
 *
 * Layer 1 (chat): proposeAssignGoals() only RESOLVES and RECORDS the plan as a
 * PENDING McpProposal and returns a human-readable preview. No business table
 * is touched. approveProposal() is the sole execution path and demands the
 * literal confirm string, so the model cannot create goals without the admin
 * explicitly approving the previewed proposal.
 *
 * Layer 2 (app): every proposal row — PENDING, EXECUTED, REJECTED, FAILED —
 * is the audit trail surfaced in the admin console (KRA > MCP activity log).
 *
 * Execution reuses upsertGoal(), the single goal-creation service, so goals
 * created here dedupe, carry forward and notify exactly like the Assign UI.
 * The acting admin comes from MCP_ADMIN_EMAIL and must hold a group-wide role;
 * their User id is stamped as assignedById/proposedBy for provenance.
 */
import { prisma } from '@/lib/prisma';
import { resolveEmployee } from '@/lib/insights/queries';
import { upsertGoal, notifyGoalsAssigned } from '@/lib/kra/create-goals';
import { computePeriodWindow, normalizePeriod } from '@/lib/kra/period';
import { GROUP_WIDE_ROLES } from '@/lib/kra/scope';
import {
    McpProposalError,
    buildPreview,
    requireTarget,
    type PlanItem,
    type ProposalPayload,
} from '@/lib/kra/mcp-proposal-format';

export { McpProposalError, buildPreview, requireTarget } from '@/lib/kra/mcp-proposal-format';
export type { PlanItem, ProposalPayload } from '@/lib/kra/mcp-proposal-format';

export const ACTION_ASSIGN_GOALS = 'ASSIGN_KRA_GOALS';

export interface AdminActor {
    id: string;
    email: string;
    role: string;
}

/** Resolve MCP_ADMIN_EMAIL to a group-wide-role User, or refuse the write. */
export async function requireMcpAdmin(email: string | undefined): Promise<AdminActor> {
    const needle = (email ?? '').trim();
    if (!needle) {
        throw new McpProposalError('MCP_ADMIN_EMAIL is not configured — write tools need the acting admin identity.');
    }
    const user = await prisma.user.findFirst({
        where: { email: { equals: needle, mode: 'insensitive' } },
        select: { id: true, email: true, role: true },
    });
    if (!user) throw new McpProposalError(`No user found for MCP_ADMIN_EMAIL "${needle}".`);
    if (!GROUP_WIDE_ROLES.has(user.role)) {
        throw new McpProposalError(`User "${needle}" has role ${user.role}; MCP writes require an admin-class role.`);
    }
    return { id: user.id, email: user.email, role: user.role };
}

export interface ProposeGoalItem {
    /** Free-text employee reference: name, email, profile id, or employee code. */
    employee: string;
    /** Per-employee target override; falls back to the proposal-level target. */
    target?: number;
    dailyTarget?: number;
}

export interface ProposeAssignGoalsInput {
    /** The admin's instruction, verbatim — stored for the audit trail. */
    instruction: string;
    /** Metric reference: id or name (must already exist; MCP never creates metrics). */
    metric: string;
    employees: ProposeGoalItem[];
    /** Default target for every employee without a per-item override. */
    target?: number;
    period?: string;
    /** Goal title; defaults to the metric name. */
    title?: string;
    /** Counts toward the weighted KRA score (default true). */
    isKra?: boolean;
    weight?: number;
    /** Optional reviewer reference (same free-text forms as employees). */
    reviewer?: string;
}

async function resolveMetric(ref: string) {
    const needle = ref.trim();
    if (!needle) throw new McpProposalError('Metric reference is required.');
    const byId = await prisma.performanceMetricDefinition.findUnique({ where: { id: needle } });
    if (byId) return byId;

    const byName = await prisma.performanceMetricDefinition.findMany({
        where: { name: { equals: needle, mode: 'insensitive' }, isActive: true },
    });
    if (byName.length === 1) return byName[0];
    if (byName.length > 1) {
        const opts = byName.map((m) => `${m.name} (id ${m.id}${m.companyId ? `, company ${m.companyId}` : ', global'})`);
        throw new McpProposalError(`Metric name "${needle}" is ambiguous — use the id. Candidates: ${opts.join('; ')}`);
    }

    const near = await prisma.performanceMetricDefinition.findMany({
        where: { name: { contains: needle, mode: 'insensitive' }, isActive: true },
        take: 5,
    });
    if (near.length === 1) return near[0];
    const hint = near.length
        ? ` Close matches: ${near.map((m) => `${m.name} (id ${m.id})`).join('; ')}`
        : ' No similar active metric exists — creating metrics is not something the MCP can do; add it in the KRA console first.';
    throw new McpProposalError(`No active metric matched "${needle}".${hint}`);
}

/** Layer-1 propose: resolve + validate everything, store PENDING, touch nothing else. */
export async function proposeAssignGoals(actor: AdminActor, input: ProposeAssignGoalsInput) {
    const instruction = (input.instruction ?? '').trim();
    if (!instruction) throw new McpProposalError('instruction is required — record the admin ask verbatim.');
    if (!input.employees?.length) throw new McpProposalError('At least one employee is required.');
    if (input.employees.length > 100) throw new McpProposalError('Too many employees in one proposal (max 100).');

    const metric = await resolveMetric(input.metric);
    if (!metric.isActive) throw new McpProposalError(`Metric "${metric.name}" is inactive.`);

    const period = normalizePeriod(input.period ?? 'MONTHLY');
    const win = computePeriodWindow(period, new Date());
    const title = (input.title ?? '').trim() || metric.name;
    const isKra = input.isKra ?? true;
    const weight = input.weight ?? 1;
    if (!Number.isFinite(weight) || weight <= 0) throw new McpProposalError('weight must be > 0.');

    let reviewerId: string | null = null;
    let reviewerName: string | null = null;
    if (input.reviewer?.trim()) {
        const rev = await resolveEmployee(prisma, input.reviewer);
        if (!rev) throw new McpProposalError(`Reviewer "${input.reviewer}" not found.`);
        const revUser = await prisma.employeeProfile.findUnique({
            where: { id: rev.id },
            select: { userId: true, user: { select: { name: true } } },
        });
        reviewerId = revUser?.userId ?? null;
        reviewerName = revUser?.user?.name ?? null;
        if (!reviewerId) throw new McpProposalError(`Reviewer "${input.reviewer}" has no linked user.`);
    }

    const items: PlanItem[] = [];
    const misses: string[] = [];
    for (const raw of input.employees) {
        const ref = (raw.employee ?? '').trim();
        if (!ref) {
            misses.push('(empty reference)');
            continue;
        }
        const profile = await resolveEmployee(prisma, ref);
        if (!profile) {
            misses.push(ref);
            continue;
        }
        const scoped = await prisma.employeeProfile.findUnique({
            where: { id: profile.id },
            select: { user: { select: { companyId: true } } },
        });
        const companyId = scoped?.user?.companyId;
        if (!companyId) {
            misses.push(`${ref} (no company)`);
            continue;
        }
        const target = requireTarget(raw.target, input.target, ref);

        // Same dedupe key as upsertGoal, so the preview says UPDATE vs CREATE truthfully.
        const existing = await prisma.employeeGoal.findFirst({
            where: { employeeId: profile.id, metricId: metric.id, type: period, startDate: win.startDate },
            select: { id: true },
        });

        items.push({
            employeeProfileId: profile.id,
            employeeName: profile.user.name,
            employeeEmail: profile.user.email,
            companyId,
            target,
            dailyTarget: raw.dailyTarget ?? null,
            existingGoalId: existing?.id ?? null,
        });
    }
    if (misses.length) {
        throw new McpProposalError(`Could not resolve employee(s): ${misses.join(', ')}. Fix the references and propose again.`);
    }

    const payload: ProposalPayload = {
        metricId: metric.id,
        metricName: metric.name,
        unit: metric.unit,
        period,
        windowStart: win.startDate.toISOString(),
        windowEnd: win.endDate.toISOString(),
        windowLabel: win.label,
        title,
        isKra,
        weight,
        reviewerId,
        reviewerName,
        items,
    };
    const preview = buildPreview(payload, instruction);

    const row = await prisma.mcpProposal.create({
        data: {
            action: ACTION_ASSIGN_GOALS,
            status: 'PENDING',
            instruction,
            payload: payload as never,
            preview,
            proposedBy: actor.id,
        },
    });

    return {
        proposalId: row.id,
        status: 'PENDING' as const,
        preview,
        nextStep: 'Show this preview to the admin. Only after they explicitly approve, call approve_proposal with this proposalId and confirm="APPROVE". If they decline, call reject_proposal.',
    };
}

/** Layer-1 approve: the ONLY path that writes business tables. */
export async function approveProposal(actor: AdminActor, proposalId: string, confirm: string) {
    if (confirm !== 'APPROVE') {
        throw new McpProposalError('Refused: confirm must be the literal string "APPROVE" (given by the admin).');
    }
    const row = await prisma.mcpProposal.findUnique({ where: { id: proposalId } });
    if (!row) throw new McpProposalError(`Proposal ${proposalId} not found.`);
    if (row.status !== 'PENDING') throw new McpProposalError(`Proposal ${proposalId} is ${row.status}, not PENDING.`);
    if (row.action !== ACTION_ASSIGN_GOALS) throw new McpProposalError(`Unknown proposal action ${row.action}.`);

    const payload = row.payload as unknown as ProposalPayload;
    if (new Date() > new Date(payload.windowEnd)) {
        await prisma.mcpProposal.update({
            where: { id: row.id },
            data: { status: 'REJECTED', decidedAt: new Date(), error: 'Stale: the proposed period ended before approval.' },
        });
        throw new McpProposalError(`Proposal ${proposalId} is stale — its ${payload.period} window (${payload.windowLabel}) has ended. Propose again.`);
    }

    const results: Array<{ employeeProfileId: string; employee: string | null; goalId?: string; created?: boolean; error?: string }> = [];
    for (const item of payload.items) {
        try {
            const res = await upsertGoal(prisma, {
                employeeId: item.employeeProfileId,
                companyId: item.companyId,
                origin: 'MANUAL',
                title: payload.title,
                unit: payload.unit,
                targetValue: item.target,
                type: payload.period,
                startDate: new Date(payload.windowStart),
                endDate: new Date(payload.windowEnd),
                isKra: payload.isKra,
                weight: payload.weight,
                metricId: payload.metricId,
                dailyTarget: item.dailyTarget,
                reviewerId: payload.reviewerId,
                assignedById: actor.id,
            });
            results.push({ employeeProfileId: item.employeeProfileId, employee: item.employeeName ?? item.employeeEmail, goalId: res.id, created: res.created });
            await notifyGoalsAssigned({ employeeId: item.employeeProfileId, origin: 'MANUAL', count: 1, periodLabel: payload.windowLabel });
        } catch (err) {
            results.push({
                employeeProfileId: item.employeeProfileId,
                employee: item.employeeName ?? item.employeeEmail,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }

    const failed = results.filter((r) => r.error).length;
    const status = failed ? 'FAILED' : 'EXECUTED';
    await prisma.mcpProposal.update({
        where: { id: row.id },
        data: {
            status,
            decidedAt: new Date(),
            result: results as never,
            error: failed ? `${failed}/${results.length} item(s) failed` : null,
        },
    });
    return { proposalId: row.id, status, results };
}

export async function rejectProposal(actor: AdminActor, proposalId: string, reason?: string) {
    const row = await prisma.mcpProposal.findUnique({ where: { id: proposalId } });
    if (!row) throw new McpProposalError(`Proposal ${proposalId} not found.`);
    if (row.status !== 'PENDING') throw new McpProposalError(`Proposal ${proposalId} is ${row.status}, not PENDING.`);
    await prisma.mcpProposal.update({
        where: { id: row.id },
        data: { status: 'REJECTED', decidedAt: new Date(), error: reason?.trim() || `Rejected by ${actor.email}` },
    });
    return { proposalId: row.id, status: 'REJECTED' as const };
}

export async function listProposals(limit = 20) {
    const rows = await prisma.mcpProposal.findMany({
        orderBy: { createdAt: 'desc' },
        take: Math.min(Math.max(limit, 1), 100),
    });
    return rows.map((r) => ({
        proposalId: r.id,
        action: r.action,
        status: r.status,
        instruction: r.instruction,
        preview: r.preview,
        result: r.result,
        error: r.error,
        createdAt: r.createdAt.toISOString(),
        decidedAt: r.decidedAt?.toISOString() ?? null,
    }));
}
