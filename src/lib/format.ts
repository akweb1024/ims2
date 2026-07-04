/**
 * Shared display-formatting helpers.
 * Use these instead of re-declaring per-page copies.
 */

/** Formats a number as INR with the en-IN grouping, or an em-dash for null/undefined. */
export const inr = (n: number | null | undefined) =>
    n == null ? '—' : `₹${n.toLocaleString('en-IN')}`;
