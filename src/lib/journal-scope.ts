import type { TokenPayload } from '@/lib/auth-core';

type ScopedUser = Pick<TokenPayload, 'id' | 'role'> | null | undefined;

/** A `where` fragment for any model carrying a `journalId`. */
export type JournalWhere = { journalId?: { in: string[] } };

/** The minimum shape of a Prisma client this module needs, so callers can stub it in tests. */
export interface JournalReader {
    journal: {
        findMany(args: {
            where: { journalManagerId: string };
            select: { id: true };
        }): Promise<{ id: string }[]>;
    };
}

/**
 * Whether this user's view of the manuscript pipeline is limited to journals assigned to
 * them, rather than the whole catalogue.
 *
 * Reads the PRIMARY role on purpose. This predicate *narrows* access rather than granting
 * it, so unioning `User.roles[]` here would invert its meaning: an admin who also holds
 * JOURNAL_MANAGER would be cut down to their own journals instead of keeping the
 * catalogue-wide view they are entitled to. Only capability checks may union.
 */
export function isJournalScopedRole(user: ScopedUser): boolean {
    return user?.role === 'JOURNAL_MANAGER';
}

/**
 * Journal-assignment scoping for the publishing surfaces.
 *
 * `companyScopeWhere` does not apply to manuscripts: Journal carries no companyId — the
 * catalogue is global — so there is no tenant column to filter on. The axis here is
 * journal assignment instead. A JOURNAL_MANAGER sees the journals they manage; the roles
 * that oversee the whole catalogue (SUPER_ADMIN, ADMIN, EDITOR_IN_CHIEF) see all of it.
 *
 * A manager with no journals assigned yet gets `{ journalId: { in: [] } }`, which matches
 * zero rows — the safe direction. The failure this replaces was an *absent* where clause,
 * which returned every journal's manuscripts to whoever opened the page.
 *
 *   const scope = await resolveJournalScope(prisma, user);
 *   const rows = await prisma.article.findMany({ where: { ...scope, ...rest } });
 */
export async function resolveJournalScope(db: JournalReader, user: ScopedUser): Promise<JournalWhere> {
    if (!isJournalScopedRole(user) || !user?.id) return {};

    const managed = await db.journal.findMany({
        where: { journalManagerId: user.id },
        select: { id: true },
    });

    return { journalId: { in: managed.map((j) => j.id) } };
}
