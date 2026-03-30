import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { 
    ensureThinkTankAccess, 
    getThinkTankWindowSettings, 
    setThinkTankWindowSettings, 
    ThinkTankWindowSettings 
} from '@/lib/think-tank';

export const dynamic = 'force-dynamic';

export const GET = authorizedRoute([], async (req: NextRequest, user: any) => {
    ensureThinkTankAccess(user);
    const settings = await getThinkTankWindowSettings(user.companyId);
    return NextResponse.json({
        settings,
        canManage: user.role === 'SUPER_ADMIN',
    });
});

export const POST = authorizedRoute(['SUPER_ADMIN'], async (req: NextRequest, user: any) => {
    ensureThinkTankAccess(user);
    const body = await req.json();
    
    // Simple validation
    const { resultSaturdays, resultTime, ideaSubmissionDays, votingEndDay, votingEndTime } = body as ThinkTankWindowSettings;
    
    if (!Array.isArray(resultSaturdays) || !resultTime || typeof ideaSubmissionDays !== 'number') {
        return NextResponse.json({ error: 'Invalid settings' }, { status: 400 });
    }

    const sanitized = {
        resultSaturdays: Array.from(new Set(resultSaturdays.map((value) => Number(value))))
            .filter((value) => Number.isInteger(value) && value >= 1 && value <= 5)
            .sort((a, b) => a - b),
        resultTime: String(resultTime),
        ideaSubmissionDays: Number(ideaSubmissionDays),
        votingEndDay: Number(votingEndDay),
        votingEndTime: String(votingEndTime),
    };

    if (
        sanitized.resultSaturdays.length === 0 ||
        !/^\d{2}:\d{2}$/.test(sanitized.resultTime) ||
        !Number.isInteger(sanitized.ideaSubmissionDays) ||
        sanitized.ideaSubmissionDays < 1 ||
        sanitized.ideaSubmissionDays > 31 ||
        !Number.isInteger(sanitized.votingEndDay) ||
        sanitized.votingEndDay < 0 ||
        sanitized.votingEndDay > 6 ||
        !/^\d{2}:\d{2}$/.test(sanitized.votingEndTime)
    ) {
        return NextResponse.json({ error: 'Invalid settings values' }, { status: 400 });
    }

    await setThinkTankWindowSettings(user.companyId, sanitized, user.id);

    return NextResponse.json({ success: true, settings: sanitized });
});
