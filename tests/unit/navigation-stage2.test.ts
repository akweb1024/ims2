import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getNavigationModules, ALL_MODULES } from '../../src/config/navigation';
import { isUserRole } from '../../src/lib/constants/roles';
import preStage2 from './fixtures/nav-hrefs-pre-stage2.json';

/**
 * Stage 2 of the nav restructure replaced the module-grant table
 * (defaultModulesByRole) with visibility derived from item roles. The risk of
 * that change is silent link loss: a role whose access was carried by a module
 * grant rather than its own entry in item.roles.
 *
 * The fixture is the exact per-role href output of the pre-Stage-2
 * getNavigationModules, captured for two allowedModules scenarios:
 *   base:     ['CORE']                                    (what every real user has)
 *   licensed: ['CORE', 'LMS', 'WEB_MONITOR', 'CONFERENCE'] (all feature grants)
 *
 * The test asserts the new output is a superset of the old for every role in
 * both scenarios, modulo an explicit, documented allowlist. Losing any other
 * link is a bug, not a design choice.
 */

const SCENARIOS: Record<string, string[]> = {
    base: ['CORE'],
    licensed: ['CORE', 'LMS', 'WEB_MONITOR', 'CONFERENCE'],
};

// Same page, new address: the old entry landed on a tab of the survivor.
// A role that had the old href must now have the replacement.
const REPOINTED: Record<string, string> = {
    '/dashboard/performance/workspace?tab=review': '/dashboard/performance/workspace',
    // C9: goal verification merged into the Review Inbox's Goals tab; the old
    // route is a redirect stub to /dashboard/review-inbox?tab=goals.
    '/dashboard/performance/verify': '/dashboard/review-inbox',
    // #192: "My IT Tasks" was one of three nav entries all reading as "my tasks" and it
    // fetched exactly what My Work's tasks tab fetches. It is now that tab, and the old
    // route is a redirect stub to /dashboard/my-work?tab=tasks.
    '/dashboard/my-tasks': '/dashboard/my-work',
    // #192: same for the personal to-do list, now My Work's To-Dos tab.
    '/dashboard/tasks': '/dashboard/my-work',
    // #193: the IT service desk raised a parallel ITTask against a priced catalogue,
    // one nav line from Support Desk, which routes to any department including IT.
    // The catalogue is gone and the old route is a redirect stub to the support desk.
    '/dashboard/service-desk': '/dashboard/support-desk',
};

// Deliberate removals. Key: `${role}:${scenario}:${href}`.
// ADMIN's default module grant showed the monitoring pages, but the monitoring
// APIs (/api/it/monitoring/*) 403 anyone whose allowedModules lacks
// WEB_MONITOR — these were dead links. The licence gate now mirrors the API:
// in the licensed scenario ADMIN keeps all three.
const DROPPED = new Set([
    'ADMIN:base:/dashboard/monitoring',
    'ADMIN:base:/dashboard/monitoring/analytics',
    'ADMIN:base:/dashboard/monitoring/manage',
]);

function hrefsFor(role: string, allowedModules: string[]): Set<string> {
    const hrefs = new Set<string>();
    for (const mod of getNavigationModules(role, allowedModules))
        for (const cat of mod.categories)
            for (const item of cat.items) hrefs.add(item.href);
    return hrefs;
}

// Fixture keys that are not members of the Prisma UserRole enum, so no user can hold them.
// The pre-Stage-2 nav listed them in its role arrays, which is why they were captured — but
// the access they describe was never reachable by anyone. Their entries are kept in the
// fixture as a record of the old config and skipped here: "did this role lose a link" is only
// a meaningful question for a role someone can actually log in as.
const NON_ROLES = new Set(['EMPLOYEE', 'IT_SUPPORT']);

describe('nav stage 2: no role silently loses a link', () => {
    for (const [role, scenarios] of Object.entries(preStage2)) {
        if (NON_ROLES.has(role)) continue;
        for (const [scenario, oldHrefs] of Object.entries(scenarios)) {
            it(`${role} (${scenario}) keeps every pre-Stage-2 link`, () => {
                const now = hrefsFor(role, SCENARIOS[scenario]);
                const lost: string[] = [];
                for (const href of oldHrefs as string[]) {
                    if (now.has(href)) continue;
                    if (DROPPED.has(`${role}:${scenario}:${href}`)) continue;
                    const replacement = REPOINTED[href];
                    if (replacement && now.has(replacement)) continue;
                    lost.push(href);
                }
                assert.deepEqual(
                    lost,
                    [],
                    `${role} (${scenario}) lost links Stage 2 must preserve:\n  ${lost.join('\n  ')}`,
                );
            });
        }
    }
});

describe('nav stage 2: intended shape', () => {
    it('every role named in the nav tree is a real UserRole member', () => {
        // The guard for the whole class. `EMPLOYEE` sat in these arrays for a long time
        // reading as "ordinary staff too", while granting nobody — a whitelist entry no user
        // can hold simply never matches. NavItem.roles is typed as UserRoleValue | '*' so tsc
        // catches this too; this asserts it at runtime for anyone reading the suite.
        const named = new Set<string>();
        for (const mod of ALL_MODULES)
            for (const cat of mod.categories)
                for (const item of cat.items) for (const r of item.roles) named.add(r);

        const unknown = [...named].filter((r) => r !== '*' && !isUserRole(r));
        assert.deepEqual(unknown, [], `nav lists roles that do not exist: ${unknown.join(', ')}`);
    });

    it('Company Transactions is finance-and-management only', () => {
        // This item previously listed EMPLOYEE, so it read as being open to ordinary staff
        // while rendering for nobody outside the four roles below. /api/payments/razorpay
        // carries the same restriction deliberately — widening financial data to all staff is
        // a business decision, so the nav was corrected to match the API rather than the
        // other way round. Flipping that means changing BOTH.
        const CT = '/dashboard/payments/by-company';
        for (const role of ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'MANAGER']) {
            assert.ok(hrefsFor(role, ['CORE']).has(CT), `${role} should see Company Transactions`);
        }
        assert.ok(!hrefsFor('EXECUTIVE', ['CORE']).has(CT), 'ordinary staff should not see Company Transactions');
    });

    it('external accounts never see internal modules', () => {
        for (const role of ['CUSTOMER', 'AGENCY', 'REVIEWER']) {
            const ids = getNavigationModules(role, ['CORE']).map((m) => m.id);
            for (const internal of ['TEAM', 'HR', 'OPS', 'ADMIN']) {
                assert.ok(!ids.includes(internal), `${role} can see the ${internal} module`);
            }
        }
    });

    it('licence-gated items require the grant (and honour it)', () => {
        assert.ok(!hrefsFor('MANAGER', ['CORE']).has('/dashboard/monitoring'));
        assert.ok(hrefsFor('MANAGER', ['CORE', 'WEB_MONITOR']).has('/dashboard/monitoring'));
        assert.ok(!hrefsFor('CUSTOMER', ['CORE']).has('/dashboard/conferences'));
        assert.ok(hrefsFor('CUSTOMER', ['CORE', 'CONFERENCE']).has('/dashboard/conferences'));
        // SUPER_ADMIN bypasses licences entirely
        assert.ok(hrefsFor('SUPER_ADMIN', []).has('/dashboard/monitoring'));
    });

    it('a role appears in a module only through its own items', () => {
        // HR sees Team & Performance because Review Inbox lists HR — and the
        // module must not drag along manager-only items.
        const team = getNavigationModules('HR', ['CORE']).find((m) => m.id === 'TEAM');
        assert.ok(team, 'HR lost the Team & Performance module');
        const hrefs = team.categories.flatMap((c) => c.items.map((i) => i.href));
        assert.ok(hrefs.includes('/dashboard/review-inbox'));
        assert.ok(!hrefs.includes('/dashboard/manager/team/salary'), 'HR sees manager-only salary link');
    });
});
