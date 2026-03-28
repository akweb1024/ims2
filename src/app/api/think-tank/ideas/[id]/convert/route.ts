import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import {
    canManageThinkTankReview,
    convertThinkTankIdeaToExecution,
    ensureThinkTankAccess,
    serializeThinkTankIdea,
} from '@/lib/think-tank';

export const dynamic = 'force-dynamic';

export const POST = authorizedRoute([], async (req: NextRequest, user: any, context: any) => {
    ensureThinkTankAccess(user);

    if (!canManageThinkTankReview(user.role)) {
        return NextResponse.json({ error: 'Only review-board roles can convert ideas into execution work.' }, { status: 403 });
    }

    const body = await req.json();
    const mode = String(body.mode || '').toUpperCase();

    if (!['PROJECT', 'TASK'].includes(mode)) {
        return NextResponse.json({ error: 'Mode must be PROJECT or TASK.' }, { status: 400 });
    }

    try {
        const result = await convertThinkTankIdeaToExecution({
            ideaId: context?.params?.id,
            companyId: user.companyId,
            convertedById: user.id,
            mode: mode as 'PROJECT' | 'TASK',
            title: body.title,
            description: body.description,
            ownerUserId: body.ownerUserId || undefined,
            memberIds: Array.isArray(body.memberIds) ? body.memberIds : [],
            startDate: body.startDate || null,
            endDate: body.endDate || null,
            dueDate: body.dueDate || null,
            priority: body.priority || null,
        });

        return NextResponse.json({
            mode: result.type,
            entity: result.entity,
            idea: serializeThinkTankIdea(result.idea, { includeDuplicates: true }),
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Failed to convert idea.' }, { status: 400 });
    }
});
