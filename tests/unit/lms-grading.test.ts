import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { gradeQuizAttempt, type GradableQuestion } from '../../src/lib/lms/grading';

const q = (id: string, correctAnswer: string, points = 1): GradableQuestion => ({ id, correctAnswer, points });

describe('gradeQuizAttempt: scoring', () => {
    it('scores the earned share of the total, not the share of questions', () => {
        // One 5-point question is worth five 1-point ones. Getting the heavy one right and the
        // light one wrong is 83.33%, not 50%.
        const grade = gradeQuizAttempt(
            [q('a', 'paris', 5), q('b', 'rome', 1)],
            { a: 'paris', b: 'madrid' },
            70,
        );

        assert.equal(grade.earnedPoints, 5);
        assert.equal(grade.totalPoints, 6);
        assert.equal(grade.score, 83.33);
        assert.equal(grade.passed, true);
        assert.deepEqual(grade.correctQuestionIds, ['a']);
    });

    it('rounds the score to two places rather than storing float noise', () => {
        const grade = gradeQuizAttempt([q('a', 'x'), q('b', 'y'), q('c', 'z')], { a: 'x', b: 'y' }, 50);
        assert.equal(grade.score, 66.67);
    });

    it('treats the pass mark as inclusive', () => {
        const exactly = gradeQuizAttempt([q('a', 'x'), q('b', 'y')], { a: 'x' }, 50);
        assert.equal(exactly.score, 50);
        assert.equal(exactly.passed, true, 'scoring exactly the pass mark is a pass');

        const under = gradeQuizAttempt([q('a', 'x'), q('b', 'y')], { a: 'x' }, 51);
        assert.equal(under.passed, false);
    });

    it('awards a perfect score when everything is right', () => {
        const grade = gradeQuizAttempt([q('a', 'x', 3), q('b', 'y', 7)], { a: 'x', b: 'y' }, 100);
        assert.equal(grade.score, 100);
        assert.equal(grade.passed, true);
    });
});

describe('gradeQuizAttempt: answer matching', () => {
    it('ignores case and surrounding whitespace', () => {
        const grade = gradeQuizAttempt([q('a', 'Paris'), q('b', 'Rome')], { a: '  paris ', b: 'ROME' }, 100);
        assert.equal(grade.score, 100, 'a trailing space is not a wrong answer');
    });

    it('accepts a falsy-but-real answer', () => {
        // The regression this extraction exists for. Grading previously guarded with
        // `if (userAnswer && …)`, so a true/false question answered with the boolean `false`,
        // or an index question answered with the number `0`, was scored as unanswered — the
        // student was marked wrong for being right.
        const grade = gradeQuizAttempt(
            [q('bool', 'false'), q('index', '0'), q('zeroish', '0.0')],
            { bool: false, index: 0, zeroish: 0.0 },
            100,
        );

        assert.equal(grade.earnedPoints, 2, 'boolean false and numeric 0 must both count');
        assert.deepEqual(grade.correctQuestionIds, ['bool', 'index']);
        // '0.0' stringifies to '0', which does not equal the stored '0.0' — matching stays a
        // plain string comparison and is not made numeric here.
        assert.ok(!grade.correctQuestionIds.includes('zeroish'));
    });

    it('counts a missing, null or blank answer as unanswered', () => {
        const grade = gradeQuizAttempt(
            [q('a', 'x'), q('b', 'y'), q('c', 'z'), q('d', 'w')],
            { b: null, c: '', d: '   ' },
            1,
        );
        assert.equal(grade.earnedPoints, 0);
        assert.deepEqual(grade.correctQuestionIds, []);
    });

    it('ignores answers submitted for questions that are not on the quiz', () => {
        const grade = gradeQuizAttempt([q('a', 'x')], { a: 'x', ghost: 'anything' }, 100);
        assert.equal(grade.totalPoints, 1);
        assert.equal(grade.score, 100);
    });

    it('handles a missing answers object entirely', () => {
        for (const answers of [null, undefined, {}]) {
            const grade = gradeQuizAttempt([q('a', 'x')], answers, 50);
            assert.equal(grade.score, 0);
            assert.equal(grade.passed, false);
        }
    });
});

describe('gradeQuizAttempt: degenerate quizzes', () => {
    it('scores an empty quiz as zero instead of dividing by zero', () => {
        const grade = gradeQuizAttempt([], {}, 70);
        assert.equal(grade.totalPoints, 0);
        assert.equal(grade.score, 0);
        assert.equal(grade.passed, false);
        assert.ok(Number.isFinite(grade.score), 'must not be NaN');
    });

    it('passes a zero-question quiz only when the pass mark is itself zero', () => {
        assert.equal(gradeQuizAttempt([], {}, 0).passed, true);
    });

    it('does not divide by zero when every question is worth no points', () => {
        const grade = gradeQuizAttempt([q('a', 'x', 0), q('b', 'y', 0)], { a: 'x', b: 'y' }, 70);
        assert.equal(grade.totalPoints, 0);
        assert.equal(grade.score, 0);
        assert.ok(Number.isFinite(grade.score));
    });
});
