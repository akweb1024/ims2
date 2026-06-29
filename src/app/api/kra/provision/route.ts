import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { handleKraError } from '@/lib/kra/http';
import { provisionEmployee } from '@/lib/kra/provision';
import { assertManagerScope, MANAGERIAL_ROLES } from '@/lib/kra/scope';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({ userId: z.string().min(1) });

// POST /api/kra/provision — idempotent new-hire provisioning (default KRAs + template goals).
export const POST = authorizedRoute(MANAGERIAL_ROLES, async (req: NextRequest, user) => {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return createErrorResponse(parsed.error);

    // Scope check: the target employee must be within the actor's reach.
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
