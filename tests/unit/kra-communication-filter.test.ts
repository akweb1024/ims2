import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { communicationTypeFilter } from '../../src/lib/kra/communication-filter';

describe('communicationTypeFilter (COMMUNICATION_LOG metric metadata)', () => {
    it('returns null for missing/empty metadata (count all types)', () => {
        assert.equal(communicationTypeFilter(null), null);
        assert.equal(communicationTypeFilter(undefined), null);
        assert.equal(communicationTypeFilter({}), null);
        assert.equal(communicationTypeFilter('CALL'), null);
    });

    it('accepts a single communicationType string, case-insensitively', () => {
        assert.deepEqual(communicationTypeFilter({ communicationType: 'CALL' }), ['CALL']);
        assert.deepEqual(communicationTypeFilter({ communicationType: 'email' }), ['EMAIL']);
    });

    it('accepts a communicationTypes array and keeps only valid enum values', () => {
        assert.deepEqual(
            communicationTypeFilter({ communicationTypes: ['CALL', 'EMAIL'] }),
            ['CALL', 'EMAIL'],
        );
        assert.deepEqual(
            communicationTypeFilter({ communicationTypes: ['call', 'BOGUS', 42] }),
            ['CALL'],
        );
    });

    it('returns null when nothing valid remains (falls back to counting all)', () => {
        assert.equal(communicationTypeFilter({ communicationType: 'NOT_A_TYPE' }), null);
        assert.equal(communicationTypeFilter({ communicationTypes: [] }), null);
    });

    it('prefers communicationTypes over communicationType when both present', () => {
        assert.deepEqual(
            communicationTypeFilter({ communicationTypes: ['MEETING'], communicationType: 'CALL' }),
            ['MEETING'],
        );
    });
});
