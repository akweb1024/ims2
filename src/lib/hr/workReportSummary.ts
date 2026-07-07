import { generateText } from '@/lib/ai/gemini';

export interface WorkReportSummaryInput {
    hoursSpent: number | null;
    tasksCompleted: number;
    revenueGenerated: number;
    ticketsResolved: number;
    chatsHandled: number;
    followUpsCompleted: number;
    content: string | null;
    tasksSnapshot?: unknown;
}

const CONTENT_SNIPPET_LEN = 140;

/**
 * Instant, free, deterministic one-line digest of a work report — for a manager scanning the
 * Review Inbox list without opening every report. Always available (no API key needed), so
 * this is what's shown by default; generateAIWorkReportSummary() is an optional upgrade.
 */
export function summarizeWorkReport(report: WorkReportSummaryInput): string {
    const parts: string[] = [];
    if (report.hoursSpent) parts.push(`${report.hoursSpent}h logged`);

    const tasks = Array.isArray(report.tasksSnapshot) ? (report.tasksSnapshot as any[]) : [];
    if (tasks.length > 0) {
        const names = tasks.slice(0, 2).map((t) => t.title).filter(Boolean).join(', ');
        parts.push(tasks.length > 2 ? `${names} +${tasks.length - 2} more` : names);
    } else if (report.tasksCompleted) {
        parts.push(`${report.tasksCompleted} tasks`);
    }

    if (report.revenueGenerated > 0) parts.push(`₹${report.revenueGenerated.toLocaleString('en-IN')} revenue`);
    if (report.ticketsResolved > 0) parts.push(`${report.ticketsResolved} tickets`);
    if (report.chatsHandled > 0) parts.push(`${report.chatsHandled} chats`);
    if (report.followUpsCompleted > 0) parts.push(`${report.followUpsCompleted} follow-ups`);

    const metricLine = parts.join(' · ');
    const cleanContent = (report.content || '').replace(/\s+/g, ' ').trim();
    const contentSnippet = cleanContent.length > CONTENT_SNIPPET_LEN
        ? `${cleanContent.slice(0, CONTENT_SNIPPET_LEN)}…`
        : cleanContent;

    return [metricLine, contentSnippet].filter(Boolean).join(' — ') || 'No details provided.';
}

/**
 * Optional upgrade over summarizeWorkReport(): a natural-language one-liner via the company's
 * configured Gemini key (Settings → Integrations → Gemini — the same connection used by STM
 * Aria and document extraction). Returns null if no key is configured or the call fails; the
 * caller should always fall back to summarizeWorkReport() in that case.
 */
export async function generateAIWorkReportSummary(
    report: WorkReportSummaryInput,
    companyId: string | null | undefined
): Promise<string | null> {
    const prompt = `Summarize this employee's daily work report in exactly one plain, factual sentence (max 30 words) for a manager quickly scanning a review queue. Do not restate "the employee" or add filler — just what was done and any notable numbers.

Hours logged: ${report.hoursSpent ?? 'not specified'}
Tasks completed: ${report.tasksCompleted}
Revenue generated: ${report.revenueGenerated}
Tickets resolved: ${report.ticketsResolved}

Report content:
"""
${report.content || '(no content provided)'}
"""`;

    return generateText(prompt, { companyId });
}
