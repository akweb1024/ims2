import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import {
    canManageThinkTankReview,
    ensureThinkTankAccess,
    logThinkTankAudit,
    saveThinkTankReviewerScore,
} from '@/lib/think-tank';

export const dynamic = 'force-dynamic';

export const POST = authorizedRoute([], async (req: NextRequest, user: any, context: any) => {
    ensureThinkTankAccess(user);
    if (!canManageThinkTankReview(user.role)) {
        return NextResponse.json({ error: 'Review-board access denied.' }, { status: 403 });
    }

    const body = await req.json();
    const score = await saveThinkTankReviewerScore({
        ideaId: context?.params?.id,
        reviewerUserId: user.id,
        scores: {
            impactScore: Number(body.impactScore ?? 0),
            feasibilityScore: Number(body.feasibilityScore ?? 0),
            costScore: Number(body.costScore ?? 0),
            speedScore: Number(body.speedScore ?? 0),
            strategicFitScore: Number(body.strategicFitScore ?? 0),
            scalabilityScore: Number(body.scalabilityScore ?? 0),
        },
        note: body.note,
    });

    await logThinkTankAudit({
        ideaId: context?.params?.id,
        actorUserId: user.id,
        action: 'REVIEWER_SCORE_SAVED',
        outcome: 'SUCCESS',
        entityId: score.id,
        metadata: { totalScore: score.totalScore },
    });

    return NextResponse.json({ score });
});
