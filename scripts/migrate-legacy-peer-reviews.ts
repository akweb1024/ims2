import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import crypto from 'crypto';

/**
 * Peer-review consolidation (C11): migrate legacy System B `Review` rows onto
 * System A (`JournalReviewer` + `ReviewAssignment` + `ReviewReport` +
 * `ReviewCertificate`).
 *
 * Per legacy review:
 *  - ensure a JournalReviewer exists for (article.journalId, review.reviewerId)
 *  - create a ReviewAssignment (PENDING stays PENDING; COMPLETED becomes
 *    VALIDATED so migrated reviews don't flood the validation queue)
 *  - for COMPLETED reviews, create a ReviewReport: rating rescaled 1-10 -> 1-5
 *    (per-dimension scores didn't exist in System B, so all four dimensions
 *    get the overall value), recommendation mapped onto the Recommendation enum
 *  - for COMPLETED reviews, issue a ReviewCertificate so historical reviewers
 *    keep their credit in the Reviewer Hub (System B wrote generic Certificate
 *    rows, which are left untouched)
 *
 * Idempotent: each created assignment carries a `legacy-review:<id>` marker in
 * `notes`; already-migrated reviews are skipped on re-run. The legacy Review
 * table is not modified or dropped.
 *
 * Usage:
 *   node --env-file=.env --import tsx scripts/migrate-legacy-peer-reviews.ts --dry-run
 *   node --env-file=.env --import tsx scripts/migrate-legacy-peer-reviews.ts
 */

const DRY_RUN = process.argv.includes('--dry-run');
const MARKER_PREFIX = 'legacy-review:';

const RECOMMENDATION_MAP: Record<string, 'ACCEPT' | 'MINOR_REVISION' | 'MAJOR_REVISION' | 'REJECT' | 'REJECT_RESUBMIT'> = {
    ACCEPT: 'ACCEPT',
    MINOR_REVISION: 'MINOR_REVISION',
    MAJOR_REVISION: 'MAJOR_REVISION',
    REJECT: 'REJECT',
    REJECT_RESUBMIT: 'REJECT_RESUBMIT',
};

// System B ratings were 1-10; System A dimensions are 1-5.
function rescaleRating(rating: number | null): number {
    if (rating === null || Number.isNaN(rating)) return 3; // no rating recorded
    return Math.min(5, Math.max(1, Math.ceil(rating / 2)));
}

async function main() {
    console.log(`Peer-review migration ${DRY_RUN ? '(DRY RUN — no writes)' : '(LIVE)'}\n`);

    const fallbackAdmin = await prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN', isActive: true },
        orderBy: { createdAt: 'asc' },
        select: { id: true, email: true },
    });
    if (!fallbackAdmin) throw new Error('No active SUPER_ADMIN found to attribute migrated assignments to.');
    console.log(`Attributing assignedBy/issuedBy to: ${fallbackAdmin.email}`);

    const reviews = await prisma.review.findMany({
        include: {
            article: { select: { id: true, title: true, journalId: true, journal: { select: { name: true } } } },
            reviewer: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
    });
    console.log(`Legacy Review rows: ${reviews.length}`);

    const alreadyMigrated = new Set(
        (
            await prisma.reviewAssignment.findMany({
                where: { notes: { contains: MARKER_PREFIX } },
                select: { notes: true },
            })
        ).map(a => a.notes!.match(new RegExp(`${MARKER_PREFIX}([0-9a-f-]+)`))?.[1])
    );

    let migrated = 0;
    let skipped = 0;
    const warnings: string[] = [];

    for (const review of reviews) {
        if (alreadyMigrated.has(review.id)) {
            skipped++;
            continue;
        }

        const isCompleted = review.status === 'COMPLETED';
        const overall = rescaleRating(review.rating);
        const recommendation = RECOMMENDATION_MAP[review.recommendation ?? ''] ?? 'MAJOR_REVISION';
        if (isCompleted && !RECOMMENDATION_MAP[review.recommendation ?? '']) {
            warnings.push(`Review ${review.id}: unmapped recommendation "${review.recommendation}" -> MAJOR_REVISION`);
        }
        if (isCompleted && review.rating === null) {
            warnings.push(`Review ${review.id}: completed with no rating -> overallRating 3/5`);
        }

        const label = `"${review.article.title}" / ${review.reviewer.email} [${review.status}]`;
        if (DRY_RUN) {
            console.log(`would migrate ${label}${isCompleted ? ` -> ${recommendation}, ${overall}/5 + certificate` : ''}`);
            migrated++;
            continue;
        }

        await prisma.$transaction(async tx => {
            const journalReviewer = await tx.journalReviewer.upsert({
                where: { journalId_userId: { journalId: review.article.journalId, userId: review.reviewerId } },
                update: {},
                create: {
                    journalId: review.article.journalId,
                    userId: review.reviewerId,
                    specialization: [],
                    bio: 'Migrated from the legacy editorial review workflow.',
                },
            });

            const assignment = await tx.reviewAssignment.create({
                data: {
                    articleId: review.articleId,
                    reviewerId: journalReviewer.id,
                    assignedBy: fallbackAdmin.id,
                    assignedDate: review.createdAt,
                    dueDate: review.dueDate ?? new Date(review.createdAt.getTime() + 14 * 24 * 60 * 60 * 1000),
                    status: isCompleted ? 'VALIDATED' : 'PENDING',
                    round: review.round,
                    notes: `Migrated from the legacy editorial review workflow (${MARKER_PREFIX}${review.id})`,
                    createdAt: review.createdAt,
                },
            });

            if (isCompleted) {
                await tx.reviewReport.create({
                    data: {
                        assignmentId: assignment.id,
                        overallRating: overall,
                        originality: overall,
                        methodology: overall,
                        clarity: overall,
                        significance: overall,
                        commentsToEditor: review.commentsToEditor || review.commentsToAuthor || '(migrated from legacy review — no editor comments recorded)',
                        commentsToAuthor: review.commentsToAuthor,
                        recommendation,
                        submittedDate: review.updatedAt,
                        isValidated: true,
                        validatedDate: review.updatedAt,
                    },
                });

                await tx.reviewCertificate.create({
                    data: {
                        reviewerId: journalReviewer.id,
                        articleId: review.articleId,
                        journalId: review.article.journalId,
                        certificateNumber: `CERT-LEGACY-${crypto.createHash('sha256').update(review.id).digest('hex').slice(0, 8).toUpperCase()}`,
                        issueDate: review.updatedAt,
                        reviewDate: review.updatedAt,
                        articleTitle: review.article.title,
                        reviewerName: review.reviewer.name || review.reviewer.email,
                        journalName: review.article.journal.name,
                        issuedBy: fallbackAdmin.id,
                        metadata: { migratedFromReviewId: review.id },
                    },
                });
            }

            await tx.journalReviewer.update({
                where: { id: journalReviewer.id },
                data: {
                    totalReviews: { increment: 1 },
                    ...(isCompleted ? { completedReviews: { increment: 1 } } : {}),
                },
            });
        });

        console.log(`migrated ${label}`);
        migrated++;
    }

    console.log(`\n${DRY_RUN ? 'Would migrate' : 'Migrated'}: ${migrated}, already migrated (skipped): ${skipped}`);
    if (warnings.length) {
        console.log(`\nWarnings:`);
        warnings.forEach(w => console.log(`  - ${w}`));
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
