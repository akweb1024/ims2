import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { generateAIInsights } from '@/lib/think-tank';

export const POST = authorizedRoute([], async (req: NextRequest, user: any) => {
    const { id } = await req.json();

    if (!id) {
        return NextResponse.json({ error: 'Idea ID is required.' }, { status: 400 });
    }

    const insights = await generateAIInsights({
        ideaId: id,
        companyId: user.companyId,
    });

    if (!insights) {
        return NextResponse.json({ error: 'Failed to generate AI insights.' }, { status: 500 });
    }

    return NextResponse.json(insights);
});
