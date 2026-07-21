/**
 * KRA auto-credit for publications.
 *
 * When an article's manuscript status transitions INTO 'PUBLISHED', credit the
 * journal's linked KRA metric to the journal manager. When it transitions OUT
 * of 'PUBLISHED' (a correction / retraction), reverse that credit. Crediting is
 * idempotent and reversible by article id, so re-publishing never double-counts
 * and moving the article back removes the credit.
 *
 * This mirrors the IT project/task completion flow (see auto-credit.ts). The
 * difference is where the pieces live: a journal has no companyId of its own, so
 * the owning company is resolved from the journal manager's user record.
 *
 * No-op (silently) when the journal has no linked metric, no manager, or the
 * status did not cross the PUBLISHED boundary. Never throws — a KRA hiccup must
 * not fail the manuscript status update that triggered it.
 */
import { prisma } from '@/lib/prisma';
import { creditLinkedMetric, reverseLinkedMetricCredit } from '@/lib/kra/auto-credit';

export interface PublicationCreditArgs {
  articleId: string;
  /** manuscriptStatus before the update. */
  fromStatus: string | null | undefined;
  /** manuscriptStatus after the update. */
  toStatus: string | null | undefined;
  /** Credit date; defaults to the article's publicationDate, then now. */
  date?: Date;
}

const PUBLISHED = 'PUBLISHED';

export async function syncPublicationMetricCredit(args: PublicationCreditArgs): Promise<void> {
  const wasPublished = args.fromStatus === PUBLISHED;
  const nowPublished = args.toStatus === PUBLISHED;
  if (wasPublished === nowPublished) return; // no change across the PUBLISHED boundary

  try {
    const article = await prisma.article.findUnique({
      where: { id: args.articleId },
      select: {
        publicationDate: true,
        journal: {
          select: {
            linkedMetricId: true,
            journalManagerId: true,
            journalManager: { select: { companyId: true } },
          },
        },
      },
    });

    const journal = article?.journal;
    if (!journal?.linkedMetricId) return; // journal isn't wired to a KRA metric

    if (nowPublished) {
      const companyId = journal.journalManager?.companyId;
      if (!companyId || !journal.journalManagerId) return; // no creditable owner
      await creditLinkedMetric({
        companyId,
        metricId: journal.linkedMetricId,
        sourceRefId: args.articleId,
        ownerUserIds: [journal.journalManagerId],
        date: args.date ?? article?.publicationDate ?? new Date(),
      });
    } else {
      await reverseLinkedMetricCredit({
        metricId: journal.linkedMetricId,
        sourceRefId: args.articleId,
      });
    }
  } catch (err) {
    console.error('[publication-credit] syncPublicationMetricCredit failed', {
      articleId: args.articleId,
      err,
    });
  }
}
