import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { companyScopeFilter, companyScopeWhere, canAccessAllCompanies } from '../../src/lib/company-scope';

const user = (over: Partial<{ role: string; companyId: string | null; allowedModules: string[] }> = {}) =>
    ({ role: 'MANAGER', companyId: 'co-1', allowedModules: [], ...over }) as any;

describe('companyScopeFilter', () => {
    it('scopes an ordinary user to their own company', () => {
        assert.deepEqual(companyScopeFilter(user()), { companyId: 'co-1' });
        assert.deepEqual(companyScopeFilter(user({ role: 'HR' })), { companyId: 'co-1' });
        assert.deepEqual(companyScopeFilter(user({ role: 'FINANCE_ADMIN' })), { companyId: 'co-1' });
    });

    it('returns an empty filter for users cleared across all companies', () => {
        // SUPER_ADMIN and ALL_COMPANIES holders see the whole group.
        assert.deepEqual(companyScopeFilter(user({ role: 'SUPER_ADMIN' })), {});
        assert.deepEqual(companyScopeFilter(user({ allowedModules: ['ALL_COMPANIES'] })), {});
        // Even when they do have a company of their own.
        assert.deepEqual(companyScopeFilter(user({ role: 'SUPER_ADMIN', companyId: 'co-1' })), {});
    });

    it('returns null — not an empty filter — for a null-company user with no clearance', () => {
        // The whole point. `{}` here would mean "no filter" and leak every company's rows,
        // which is exactly what `companyId: user.companyId || undefined` did.
        assert.equal(companyScopeFilter(user({ companyId: null })), null);
        assert.equal(companyScopeFilter(user({ role: 'HR', companyId: null })), null);
        assert.equal(companyScopeFilter(user({ companyId: undefined })), null);
    });

    it('returns null for no user at all', () => {
        assert.equal(companyScopeFilter(null), null);
        assert.equal(companyScopeFilter(undefined), null);
    });

    it('agrees with canAccessAllCompanies', () => {
        for (const u of [user(), user({ role: 'SUPER_ADMIN' }), user({ allowedModules: ['ALL_COMPANIES'] })]) {
            const scope = companyScopeFilter(u);
            assert.equal(canAccessAllCompanies(u), scope !== null && !('companyId' in scope));
        }
    });
});

describe('companyScopeWhere (spread-safe form)', () => {
    it('matches the filter form for ordinary and all-company users', () => {
        assert.deepEqual(companyScopeWhere(user()), { companyId: 'co-1' });
        assert.deepEqual(companyScopeWhere(user({ role: 'SUPER_ADMIN' })), {});
    });

    it('matches ZERO rows for a null-company user — never every row', () => {
        // The old `user.companyId ? { companyId } : {}` produced {} here, i.e. no filter
        // at all, which returned every company's rows. `{ in: [] }` matches nothing.
        assert.deepEqual(companyScopeWhere(user({ companyId: null })), { companyId: { in: [] } });
        assert.deepEqual(companyScopeWhere(null), { companyId: { in: [] } });
    });

    it('is always spreadable — never null', () => {
        for (const u of [user(), user({ role: 'SUPER_ADMIN' }), user({ companyId: null }), null]) {
            const scope = companyScopeWhere(u as any);
            assert.ok(scope && typeof scope === 'object');
            assert.doesNotThrow(() => ({ ...scope, status: 'ACTIVE' }));
        }
    });
});
