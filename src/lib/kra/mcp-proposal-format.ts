/**
 * Pure helpers for MCP write proposals — no prisma/env imports, so unit tests
 * and the stdio server can load them without app configuration. The IO side
 * lives in src/lib/kra/mcp-proposals.ts.
 */
import type { KraPeriodType } from '@/lib/kra/period';

export class McpProposalError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'McpProposalError';
    }
}

export interface PlanItem {
    employeeProfileId: string;
    employeeName: string | null;
    employeeEmail: string;
    companyId: string;
    target: number;
    dailyTarget: number | null;
    /** Set when the dedupe key already matches a goal — approve UPDATES it. */
    existingGoalId: string | null;
}

export interface ProposalPayload {
    metricId: string;
    metricName: string;
    unit: string;
    period: KraPeriodType;
    windowStart: string; // ISO
    windowEnd: string; // ISO
    windowLabel: string;
    title: string;
    isKra: boolean;
    weight: number;
    reviewerId: string | null;
    reviewerName: string | null;
    items: PlanItem[];
}

export function buildPreview(payload: ProposalPayload, instruction: string): string {
    const lines: string[] = [];
    lines.push(`PROPOSAL — assign KRA goals (requires approve_proposal to execute)`);
    lines.push(`Instruction: ${instruction}`);
    lines.push(
        `Metric: ${payload.metricName} [${payload.unit}] · Period: ${payload.period} (${payload.windowLabel})` +
            ` · isKra: ${payload.isKra} · weight: ${payload.weight}`,
    );
    if (payload.reviewerId) lines.push(`Reviewer: ${payload.reviewerName ?? payload.reviewerId}`);
    lines.push(`Goal title: "${payload.title}"`);
    lines.push(`Employees (${payload.items.length}):`);
    for (const it of payload.items) {
        const daily = it.dailyTarget != null ? `, daily ${it.dailyTarget}` : '';
        const mode = it.existingGoalId ? 'UPDATE existing goal' : 'CREATE';
        lines.push(`  - ${it.employeeName ?? it.employeeEmail} → target ${it.target} ${payload.unit}${daily} [${mode}]`);
    }
    return lines.join('\n');
}

/** Validate a target value; returns the number or throws with the employee ref for context. */
export function requireTarget(value: number | undefined, fallback: number | undefined, ref: string): number {
    const t = value ?? fallback;
    if (typeof t !== 'number' || !Number.isFinite(t) || t <= 0) {
        throw new McpProposalError(`No valid target for "${ref}" — give a per-employee target or a proposal-level one (> 0).`);
    }
    return t;
}
