/**
 * Support tickets — the upgraded ITSupportTicket. Any employee raises a request routed to a
 * target department (IT by default) with an optional asset; triagers (IT admins, managers)
 * assign/reassign it, move it through a status lifecycle, and reply on a follow-up thread.
 *
 * Status/priority are validated here (app-level enums) rather than in the DB, so the
 * existing free-string column keeps working without a risky enum migration.
 */

export const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

/** A status a ticket is considered "done" in — resolvedAt is stamped for these. */
export const TICKET_DONE_STATUSES: TicketStatus[] = ['RESOLVED', 'CLOSED'];

/** Roles that can triage any ticket in their company: assign, change status/priority, reply internally. */
export const TICKET_TRIAGE_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'IT_MANAGER',
  'IT_ADMIN',
  'IT_SUPPORT',
  'MANAGER',
  'TEAM_LEADER',
];

/** Every internal role may raise a ticket and see their own. */
export const TICKET_USER_ROLES = [
  'SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE', 'EMPLOYEE',
  'FINANCE_ADMIN', 'HR_MANAGER', 'HR', 'IT_MANAGER', 'IT_ADMIN', 'IT_SUPPORT',
  'EDITOR', 'EDITOR_IN_CHIEF', 'SECTION_EDITOR', 'JOURNAL_MANAGER',
  'PLAGIARISM_CHECKER', 'QUALITY_CHECKER',
];

export function canTriageTickets(role: string): boolean {
  return TICKET_TRIAGE_ROLES.includes(role);
}

export const ticketInclude = {
  requester: { select: { id: true, name: true, email: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
  department: { select: { id: true, name: true } },
  asset: { select: { id: true, name: true, type: true } },
  _count: { select: { comments: true } },
} as const;

export function isValidStatus(s: unknown): s is TicketStatus {
  return typeof s === 'string' && (TICKET_STATUSES as readonly string[]).includes(s);
}
export function isValidPriority(p: unknown): p is TicketPriority {
  return typeof p === 'string' && (TICKET_PRIORITIES as readonly string[]).includes(p);
}
