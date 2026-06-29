import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const schema = z.object({ dryRun: z.boolean().default(true) });

/**
 * POST /api/admin/company-backfill
 * Backfills User.companyId (the "primary company") from each employee's primary/active
 * company designation, and connects that company into the user's companies[] access list.
 * - { dryRun: true }  (default) -> report only, no writes.
 * - { dryRun: false }           -> apply the updates.
 * SUPER_ADMIN / ADMIN only.
 */
export const POST = authorizedRoute(['SUPER_ADMIN', 'ADMIN'], async (req: NextRequest) => {
  try {
    const { dryRun } = schema.parse(await req.json().catch(() => ({})));

    const profiles = await prisma.employeeProfile.findMany({
      where: { user: { isActive: true } },
      select: {
        userId: true,
        user: { select: { companyId: true } },
        companyDesignations: { select: { companyId: true, isPrimary: true, isActive: true } },
      },
    });

    let ok = 0;
    let nullFilled = 0;
    let mismatchFixed = 0;
    let noDesignation = 0;
    const samples: Array<{ userId: string; from: string | null; to: string }> = [];
    const updates: Array<{ userId: string; to: string }> = [];

    for (const p of profiles) {
      const designs = p.companyDesignations ?? [];
      const chosen = designs.find((d) => d.isPrimary && d.isActive) || designs.find((d) => d.isActive) || designs[0];
      const target = chosen?.companyId ?? null;
      if (!target) { noDesignation++; continue; }

      const current = p.user?.companyId ?? null;
      if (current === target) { ok++; continue; }

      if (current === null) nullFilled++; else mismatchFixed++;
      if (samples.length < 15) samples.push({ userId: p.userId, from: current, to: target });
      updates.push({ userId: p.userId, to: target });
    }

    let applied = 0;
    let failed = 0;
    if (!dryRun) {
      for (const u of updates) {
        try {
          await prisma.user.update({
            where: { id: u.userId },
            data: { companyId: u.to, companies: { connect: { id: u.to } } },
          });
          applied++;
        } catch (err) {
          failed++;
          logger.error('company-backfill update failed', err, { userId: u.userId });
        }
      }
    }

    return NextResponse.json({
      dryRun,
      totalProfiles: profiles.length,
      ok,
      willUpdate: updates.length,
      nullFilled,
      mismatchFixed,
      noDesignation,
      applied,
      failed,
      samples,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
});
