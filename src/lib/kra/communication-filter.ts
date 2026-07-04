/**
 * Pure helpers for COMMUNICATION_LOG-sourced KRA metrics.
 * Kept dependency-free so unit tests can import without touching prisma/env.
 */

/** CommunicationType enum values a COMMUNICATION_LOG metric may filter on. */
export const COMMUNICATION_TYPES = new Set([
    'EMAIL', 'CALL', 'COMMENT', 'INQUIRY', 'INVOICE_SENT', 'CATALOGUE_SENT', 'MEETING',
]);

/**
 * Read the communication-type filter from metric metadata. Accepts
 * `{ "communicationType": "CALL" }` or `{ "communicationTypes": ["CALL","EMAIL"] }`;
 * no/invalid filter means "count every communication type".
 */
export function communicationTypeFilter(metadata: unknown): string[] | null {
    if (!metadata || typeof metadata !== 'object') return null;
    const meta = metadata as Record<string, unknown>;
    const raw = meta.communicationTypes ?? meta.communicationType;
    const list = (Array.isArray(raw) ? raw : [raw])
        .filter((t): t is string => typeof t === 'string')
        .map((t) => t.toUpperCase())
        .filter((t) => COMMUNICATION_TYPES.has(t));
    return list.length > 0 ? list : null;
}
