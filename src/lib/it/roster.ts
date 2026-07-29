/**
 * Who is actually on an IT project.
 *
 * A person can be attached to a project four different ways — named as its manager, named as
 * its team lead, tagged onto it, or simply holding one of its tasks — and plenty of people are
 * attached more than one way. This collapses all of that into a single deduped roster where
 * each person appears once, under their most senior role.
 *
 * Pure module: the list endpoint builds the roster server-side, the detail page builds it in the
 * browser from the payload it already has. Same function, so the two screens can never disagree.
 */

export type ProjectRole = 'Manager' | 'Lead' | 'Contributor' | 'Member';

/** Seniority, lowest wins when someone is attached several ways. */
export const PROJECT_ROLE_RANK: Record<ProjectRole, number> = {
  Manager: 0,
  Lead: 1,
  Contributor: 2,
  Member: 3,
};

export interface RosterPerson {
  id: string;
  name?: string | null;
  email?: string | null;
}

export interface RosterMember {
  id: string;
  name: string | null;
  email: string | null;
  role: ProjectRole;
  /** Tasks on this project assigned to them and not yet finished or cancelled. */
  openTasks: number;
  doneTasks: number;
  /** Hours logged against the project, when time entries are supplied. */
  hours: number;
}

export interface RosterInput {
  projectManager?: RosterPerson | null;
  teamLead?: RosterPerson | null;
  taggedEmployees?: RosterPerson[] | null;
  tasks?: Array<{ status?: string | null; assignedTo?: RosterPerson | null }> | null;
  /** Optional — only the detail endpoint loads these. */
  timeEntries?: Array<{ hours?: number | null; user?: RosterPerson | null }> | null;
}

export function buildProjectRoster(input: RosterInput): RosterMember[] {
  const roster = new Map<string, RosterMember>();

  const enrol = (person: RosterPerson | null | undefined, role: ProjectRole) => {
    if (!person?.id) return null;
    const existing = roster.get(person.id);
    if (existing) {
      if (PROJECT_ROLE_RANK[role] < PROJECT_ROLE_RANK[existing.role]) existing.role = role;
      return existing;
    }
    const member: RosterMember = {
      id: person.id,
      name: person.name ?? null,
      email: person.email ?? null,
      role,
      openTasks: 0,
      doneTasks: 0,
      hours: 0,
    };
    roster.set(person.id, member);
    return member;
  };

  enrol(input.projectManager, 'Manager');
  enrol(input.teamLead, 'Lead');
  input.taggedEmployees?.forEach((person) => enrol(person, 'Member'));

  input.tasks?.forEach((task) => {
    const member = enrol(task.assignedTo, 'Contributor');
    if (!member) return;
    if (task.status === 'COMPLETED') member.doneTasks += 1;
    else if (task.status !== 'CANCELLED') member.openTasks += 1;
  });

  input.timeEntries?.forEach((entry) => {
    const member = enrol(entry.user, 'Contributor');
    if (!member) return;
    member.hours += entry.hours ?? 0;
  });

  return [...roster.values()].sort(
    (a, b) =>
      PROJECT_ROLE_RANK[a.role] - PROJECT_ROLE_RANK[b.role] ||
      (a.name || '').localeCompare(b.name || ''),
  );
}

/** A one-line summary of what a roster member is carrying, for tooltips and captions. */
export function rosterMemberNote(member: RosterMember): string | null {
  const parts: string[] = [];
  if (member.openTasks || member.doneTasks) {
    parts.push(`${member.openTasks} open · ${member.doneTasks} done`);
  }
  if (member.hours > 0) parts.push(`${Math.round(member.hours * 10) / 10}h logged`);
  return parts.length ? parts.join(' · ') : null;
}
