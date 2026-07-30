/**
 * The single source of truth for the Prisma `Priority` enum in the UI.
 *
 * Why this module exists: the enum's members were re-typed as string literals across a dozen
 * screens, and they drifted. Several offered a `CRITICAL` priority the enum has never
 * contained, so choosing it failed the save (and the display maps keyed on it quietly rendered
 * urgent work with default styling). With `ignoreBuildErrors: true` in next.config, nothing
 * caught any of it.
 *
 * Import `PRIORITY_OPTIONS` for dropdowns and type style maps as `Record<PriorityValue, …>`.
 * Then adding, removing or renaming an enum member becomes a compile error at every call site
 * instead of a silent runtime failure.
 *
 * ⚠️ This is for the ENUM-backed columns only — `ITTask.priority`, `ITProject.priority`,
 * `Task.priority`. It is NOT for support tickets: `ITSupportTicket.priority` is a free String
 * validated against `TICKET_PRIORITIES` in `@/lib/support-tickets`, which legitimately DOES
 * include CRITICAL. The company `Project.priority` is a free String too. Check the column type
 * in schema.prisma before reaching for this.
 */

// Type-only import: erased at build time, so this module stays safe in client components.
import type { Priority } from '@prisma/client';

/** Ordered least → most urgent, which is also the order dropdowns should present. */
export const PRIORITY_VALUES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export type PriorityValue = (typeof PRIORITY_VALUES)[number];

/**
 * Compile-time guard that the list above and the generated Prisma enum are exactly the same
 * set. If schema.prisma adds, removes or renames a `Priority` member, `Equals` becomes `false`,
 * `false` fails `extends true`, and this file stops compiling — which is the entire point.
 *
 * It has to be an `Expect<…>` constraint rather than a conditional type that merely *resolves*
 * to an error object: nothing consumes a bare type alias, so that version compiles happily
 * while drifted. Exported so it counts as used.
 */
type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Expect<T extends true> = T;
export type PriorityListMatchesPrismaEnum = Expect<Equals<PriorityValue, Priority>>;

/** Human labels. Naming the value it stores; "Critical" here is what started the drift. */
export const PRIORITY_LABELS: Record<PriorityValue, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

/** Ready-made `<option>` / segmented-control source. */
export const PRIORITY_OPTIONS: ReadonlyArray<{ value: PriorityValue; label: string }> =
  PRIORITY_VALUES.map((value) => ({ value, label: PRIORITY_LABELS[value] }));

export function isPriorityValue(v: unknown): v is PriorityValue {
  return typeof v === 'string' && (PRIORITY_VALUES as readonly string[]).includes(v);
}
