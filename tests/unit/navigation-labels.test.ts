import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_MODULES } from '../../src/config/navigation';

/**
 * Guards the sidebar against the failure that made it confusing in the first place:
 * labels are authored per-item, so nothing noticed when two unrelated pages ended up
 * with the same name. Five such collisions had accumulated ("Work Reports",
 * "Revenue Analytics", "Analytics", "Invoices", "Performance Workspace") — a user
 * clicking one had no way to know which page they'd land on.
 *
 * These tests are the "something that checks".
 */

type Item = { name: string; href: string; roles: string[] };

const allItems: Array<Item & { module: string; category: string }> = ALL_MODULES.flatMap((mod) =>
    mod.categories.flatMap((cat) =>
        cat.items.map((item) => ({ ...item, module: mod.name, category: cat.title })),
    ),
);

/** Two entries may share a label only if they point at the same page. */
describe('navigation labels', () => {
    it('never gives one label two different destinations', () => {
        const byLabel = new Map<string, Set<string>>();
        for (const item of allItems) {
            if (!byLabel.has(item.name)) byLabel.set(item.name, new Set());
            byLabel.get(item.name)!.add(item.href);
        }

        const collisions = [...byLabel.entries()]
            .filter(([, hrefs]) => hrefs.size > 1)
            .map(([name, hrefs]) => `"${name}" -> ${[...hrefs].join('  |  ')}`);

        assert.deepEqual(
            collisions,
            [],
            `Same label, different pages — rename so each says where it goes:\n  ${collisions.join('\n  ')}`,
        );
    });

    it('never repeats a label inside one module', () => {
        const seen = new Map<string, string[]>();
        for (const item of allItems) {
            const key = `${item.module} :: ${item.name}`;
            seen.set(key, [...(seen.get(key) ?? []), item.href]);
        }
        const dupes = [...seen.entries()]
            .filter(([, hrefs]) => hrefs.length > 1)
            .map(([key, hrefs]) => `${key} x${hrefs.length}`);

        assert.deepEqual(dupes, [], `A module lists the same label twice:\n  ${dupes.join('\n  ')}`);
    });

    it('has no empty labels or hrefs, and every href is a dashboard route', () => {
        for (const item of allItems) {
            assert.ok(item.name.trim(), `empty label at ${item.module}/${item.category}`);
            assert.ok(
                item.href.startsWith('/dashboard'),
                `${item.name} points outside /dashboard: ${item.href}`,
            );
            assert.ok(item.roles.length > 0, `${item.name} has no roles and can never render`);
        }
    });
});
