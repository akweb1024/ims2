/**
 * Quiz grading for course lessons.
 *
 * Pure module — no Prisma, no IO — so the arithmetic that decides whether someone passed a
 * course can be tested directly. It was previously inline in the submit route, where it could
 * not be.
 */

export interface GradableQuestion {
    id: string;
    /** Stored as a string on CourseQuizQuestion regardless of question type. */
    correctAnswer: string;
    points: number;
}

export interface QuizGrade {
    earnedPoints: number;
    totalPoints: number;
    /** Percentage, 0–100, rounded to two places. */
    score: number;
    passed: boolean;
    correctQuestionIds: string[];
}

/**
 * Compare one submitted answer against the stored one.
 *
 * Answers arrive as JSON, so a true/false question may come back as the boolean `false` and a
 * numeric-index answer as the number `0`. The previous implementation guarded with
 * `if (userAnswer && …)`, which treats both of those as "not answered" and marks a correct
 * response wrong. Only genuinely absent values — undefined, null, or an empty/whitespace
 * string — count as unanswered.
 *
 * Comparison is trimmed and case-insensitive, matching the old lowercase comparison but no
 * longer failing on a trailing space.
 */
function isCorrect(submitted: unknown, correctAnswer: string): boolean {
    if (submitted === undefined || submitted === null) return false;

    const given = String(submitted).trim().toLowerCase();
    if (given === '') return false;

    return given === String(correctAnswer).trim().toLowerCase();
}

/**
 * Grade a submitted attempt.
 *
 * `answers` is keyed by question id. Questions carry their own weight, so a quiz can mix a
 * 1-point recall question with a 5-point one; the score is the earned share of the total,
 * not the share of questions answered correctly.
 */
export function gradeQuizAttempt(
    questions: readonly GradableQuestion[],
    answers: Record<string, unknown> | null | undefined,
    passingScore: number,
): QuizGrade {
    const submitted = answers ?? {};

    let totalPoints = 0;
    let earnedPoints = 0;
    const correctQuestionIds: string[] = [];

    for (const question of questions) {
        totalPoints += question.points;

        if (isCorrect(submitted[question.id], question.correctAnswer)) {
            earnedPoints += question.points;
            correctQuestionIds.push(question.id);
        }
    }

    // A quiz with no questions (or only zero-point ones) scores 0 rather than dividing by zero.
    // It cannot be passed unless the pass mark is itself 0.
    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 10_000) / 100 : 0;

    return {
        earnedPoints,
        totalPoints,
        score,
        passed: score >= passingScore,
        correctQuestionIds,
    };
}
