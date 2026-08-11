import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isJournalScopedRole, resolveJournalScope, type JournalReader } from '../../src/lib/journal-scope';

const user = (over: Partial<{ id: string; role: string }> = {}) =>
    ({ id: 'u-1', role: 'JOURNAL_MANAGER', ...over }) as any;

/** A prisma stand-in that records the filter it was asked for. */
const reader = (ids: string[]) => {
    const calls: unknown[] = [];
    const db: JournalReader = {
        journal: {
            async findMany(args) {
                calls.push(args);
                return ids.map((id) => ({ id }));
            },
        },
    };
    return { db, calls };
};

describe('isJournalScopedRole', () => {
    it('scopes journal managers', () => {
        assert.equal(isJournalScopedRole(user()), true);
    });

    it('does not scope the roles that oversee the whole catalogue', () => {
        for (const role of ['SUPER_ADMIN', 'ADMIN', 'EDITOR_IN_CHIEF', 'EDITOR']) {
            assert.equal(isJournalScopedRole(user({ role })), false, `${role} should see every journal`);
        }
    });

    it('reads the primary role only, never the additional ones', () => {
        // This predicate NARROWS access. Unioning User.roles[] would invert it: an admin who
        // also holds JOURNAL_MANAGER would be cut down to their own journals. Only capability
        // checks may union — see src/lib/constants/roles.ts.
        const adminAlsoManager = { id: 'u-1', role: 'ADMIN', roles: ['JOURNAL_MANAGER'] } as any;
        assert.equal(isJournalScopedRole(adminAlsoManager), false);
    });

    it('does not scope a missing user (the caller is expected to reject them first)', () => {
        assert.equal(isJournalScopedRole(null), false);
        assert.equal(isJournalScopedRole(undefined), false);
    });
});

describe('resolveJournalScope', () => {
    it('restricts a journal manager to the journals assigned to them', async () => {
        const { db, calls } = reader(['j-1', 'j-2']);
        const scope = await resolveJournalScope(db, user());

        assert.deepEqual(scope, { journalId: { in: ['j-1', 'j-2'] } });
        assert.deepEqual(calls, [{ where: { journalManagerId: 'u-1' }, select: { id: true } }]);
    });

    it('matches zero rows for a manager with no journals assigned yet', async () => {
        // The safe direction. `{}` here would mean "no filter" and return every journal's
        // manuscripts, which is precisely the failure this replaces.
        const { db } = reader([]);
        assert.deepEqual(await resolveJournalScope(db, user()), { journalId: { in: [] } });
    });

    it('returns an empty filter — and runs no query — for catalogue-wide roles', async () => {
        for (const role of ['SUPER_ADMIN', 'ADMIN', 'EDITOR_IN_CHIEF']) {
            const { db, calls } = reader(['j-1']);
            assert.deepEqual(await resolveJournalScope(db, user({ role })), {});
            assert.equal(calls.length, 0, `${role} should not need a journal lookup`);
        }
    });

    it('never widens: the returned fragment is spread-safe over an existing where', async () => {
        const { db } = reader(['j-1']);
        const scope = await resolveJournalScope(db, user());
        const where = { ...scope, status: 'PENDING' };

        assert.deepEqual(where, { journalId: { in: ['j-1'] }, status: 'PENDING' });
    });
});
