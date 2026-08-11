import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { forecastDepletion, computeHealthScore } from '../../src/lib/digital-twin/intelligence';
import type { InventoryTwin, EmployeeTwin } from '../../src/lib/digital-twin/twin-engine';

/**
 * The depletion forecast used to derive its daily rate from `velocity` — the count of movement
 * rows fetched under `take: 10`. It capped at 10 however fast stock moved, ignored how much
 * each movement was for, ignored direction, ignored when it happened, and fell back to
 * 0.5 units/day for items nobody had touched. Every "runs out in N days" was invented.
 */

const stock = (over: Partial<InventoryTwin> = {}): InventoryTwin => ({
    id: 'i1',
    sku: 'PAP-A4',
    name: 'A4 paper',
    quantity: 100,
    minLevel: 20,
    status: 'HEALTHY',
    warehouse: 'Main',
    dailyConsumption: 0,
    unitsConsumed: 0,
    daysOfCover: null,
    confidence: 0,
    ...over,
});

describe('forecastDepletion', () => {
    it('says nothing about an item that is healthy and not moving', () => {
        // The old model gave this a 0.5/day fallback rate and forecast it running out, so a
        // shelf nobody had touched in a year still generated an alert.
        assert.deepEqual(forecastDepletion([stock()]), []);
    });

    it('flags an item running out within a week as high risk', () => {
        const [f] = forecastDepletion([stock({ quantity: 20, dailyConsumption: 4, daysOfCover: 5, confidence: 70 })]);

        assert.equal(f.risk, 'HIGH');
        assert.equal(f.estimatedDaysLeft, 5);
        assert.equal(f.dailyConsumption, 4);
        assert.equal(f.confidence, 70);
    });

    it('flags an item with a month of cover as medium risk', () => {
        const [f] = forecastDepletion([stock({ quantity: 60, dailyConsumption: 2, daysOfCover: 30 })]);
        assert.equal(f.risk, 'MEDIUM');
    });

    it('leaves an item with plenty of cover alone', () => {
        assert.deepEqual(forecastDepletion([stock({ dailyConsumption: 0.5, daysOfCover: 200 })]), []);
    });

    it('flags a critically low item even with no consumption to project from', () => {
        // Stock level alone is enough to raise it; the forecast just has no date to offer.
        const [f] = forecastDepletion([stock({ quantity: 5, minLevel: 20, status: 'CRITICAL' })]);

        assert.equal(f.risk, 'HIGH');
        assert.equal(f.estimatedDaysLeft, null, 'no rate means no date, not a made-up one');
        assert.equal(f.confidence, 0);
    });

    it('flags a warning-level item with no consumption as medium risk', () => {
        const [f] = forecastDepletion([stock({ quantity: 25, minLevel: 20, status: 'WARNING' })]);
        assert.equal(f.risk, 'MEDIUM');
        assert.equal(f.estimatedDaysLeft, null);
    });

    it('scales with how much is used, not how often', () => {
        // Two items, same stock. The one being drawn down harder runs out sooner. Under the
        // old row-counting model these were indistinguishable.
        const forecasts = forecastDepletion([
            stock({ id: 'fast', quantity: 100, dailyConsumption: 20, daysOfCover: 5 }),
            stock({ id: 'slow', quantity: 100, dailyConsumption: 1, daysOfCover: 100 }),
        ]);

        assert.equal(forecasts.length, 1, 'only the fast mover is at risk');
        assert.equal(forecasts[0].inventoryId, 'fast');
    });

    it('carries identifying detail through for the UI', () => {
        const [f] = forecastDepletion([stock({ quantity: 10, daysOfCover: 2, dailyConsumption: 5 })]);
        assert.equal(f.itemName, 'A4 paper');
        assert.equal(f.sku, 'PAP-A4');
        assert.equal(f.currentQuantity, 10);
        assert.equal(f.minLevel, 20);
    });
});

const person = (over: Partial<EmployeeTwin> = {}): EmployeeTwin =>
    ({
        id: 'e1',
        name: 'Asha',
        status: 'ACTIVE',
        bandwidth: 80,
        overdueTasks: 0,
        avgKpiProgress: 90,
        avgKraMatch30d: 0.9,
        attendanceDays7d: 5,
        disciplineScore: 90,
        engagementScore: 70,
        ...over,
    }) as EmployeeTwin;

describe('computeHealthScore', () => {
    it('reports a perfectly healthy organisation as 100', () => {
        assert.equal(computeHealthScore([person()], [stock()]), 100);
    });

    it('reports an empty organisation as 100 rather than dividing by zero', () => {
        const score = computeHealthScore([], []);
        assert.equal(score, 100);
        assert.ok(Number.isFinite(score));
    });

    it('drops as problems accumulate', () => {
        const healthy = computeHealthScore([person()], []);
        const overloaded = computeHealthScore([person({ status: 'OVERLOADED' })], []);
        const worse = computeHealthScore([person({ status: 'OVERLOADED', overdueTasks: 5, avgKpiProgress: 20 })], []);

        assert.ok(overloaded < healthy);
        assert.ok(worse < overloaded);
    });

    it('treats leave as neutral, not as a problem', () => {
        // Someone on approved leave is not a failure of the organisation.
        assert.equal(computeHealthScore([person({ status: 'ON_LEAVE' })], []), 100);
    });

    it('penalises critical stock more heavily than a warning', () => {
        const warning = computeHealthScore([], [stock({ status: 'WARNING' })]);
        const critical = computeHealthScore([], [stock({ status: 'CRITICAL' })]);

        assert.ok(critical < warning);
    });

    it('never goes below zero however bad things get', () => {
        const score = computeHealthScore(
            Array.from({ length: 5 }, (_, i) =>
                person({
                    id: `e${i}`,
                    status: 'OVERLOADED',
                    bandwidth: 0,
                    overdueTasks: 20,
                    avgKpiProgress: 0,
                    avgKraMatch30d: 0,
                    attendanceDays7d: 0,
                    disciplineScore: 0,
                    engagementScore: 0,
                }),
            ),
            [stock({ status: 'CRITICAL' })],
        );

        assert.ok(score >= 0, 'the score is a 0-100 scale, not an unbounded penalty count');
        assert.ok(Number.isFinite(score));
    });
});
