import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { handleKraError } from '@/lib/kra/http';
import { provisionEmployee } from '@/lib/kra/provision';
import { assertManagerScope, MANAGERIAL_ROLES } from '@/lib/kra/scope';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const singleSchema = z.object({ userId: z.string().min(1), sweep: z.undefined().optional() });
const sweepSchema = z.object({ sweep: z.literal(true), companyId: z.string().optional(), departmentId: z.string().optional() });

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER'];

// POST /api/kra/provision
//  - { userId }            : provision one employee (managerial + scope).
//  - { sweep: true, ... }  : bulk-provision all active profiled employees in scope (ADMIN-class).
// Idempotent — only fills what's missing.
export const POST = authorizedRoute(MANAGERIAL_ROLES, async (req: NextRequest, user) => {
  try {
    const body = await req.json().catch(() => ({}));

    // --- Bulk sweep ---
    if (body?.sweep === true) {
      if (!ADMIN_ROLES.includes(user.role)) return createErrorResponse('Sweep requires ADMIN/HR role', 403);
      const parsed = sweepSchema.safeParse(body);
      if (!parsed.success) return createErrorResponse(parsed.error);

      const companyId = parsed.data.companyId ?? user.companyId ?? undefined;
      const profiles = await prisma.employeeProfile.findMany({
        where: {
          user: { isActive: true, ...(companyId ? { companyId } : {}), ...(parsed.data.departmentId ? { departmentId: parsed.data.departmentId } : {}) },
        },
        select: { userId: true },
      });

      let provisioned = 0, krasCreated = 0, goalsCreated = 0, failed = 0;
      const failures: Array<{ userId: string; error: string }> = [];
      for (const p of profiles) {
        try {
          const r = await provisionEmployee(p.userId, user.id);
          provisioned++; krasCreated += r.krasCreated; goalsCreated += r.goalsCreated;
        } catch (err) {
          failed++;
          const message = err instanceof Error ? err.message : String(err);
          if (failures.length < 15) failures.push({ userId: p.userId, error: message });
          logger.error('Sweep provisioning failed', err, { userId: p.userId });
        }
      }
      return NextResponse.json({ success: true, sweep: true, employees: profiles.length, provisioned, krasCreated, goalsCreated, failed, failures });
    }

    // --- Single employee ---
    const parsed = singleSchema.safeParse(body);
    if (!parsed.success) return createErrorResponse(parsed.error);

    const profile = await prisma.employeeProfile.findUnique({
      where: { userId: parsed.data.userId },
      select: { id: true },
    });
    if (!profile) return createErrorResponse('Employee profile not found', 404);
    await assertManagerScope({ id: user.id, role: user.role, companyId: user.companyId }, profile.id);

    const result = await provisionEmployee(parsed.data.userId, user.id);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return handleKraError(error);
  }
});
