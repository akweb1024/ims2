import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { ensureThinkTankAccess, saveThinkTankAttachment } from '@/lib/think-tank';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_SIZE = 10 * 1024 * 1024;

export const POST = authorizedRoute([], async (req: NextRequest, user: any) => {
    ensureThinkTankAccess(user);
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
        return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: 'File exceeds 10 MB limit.' }, { status: 400 });
    }

    const result = await saveThinkTankAttachment({
        file,
        uploadedById: user.id,
        context: 'think_tank:idea',
    });

    return NextResponse.json(result, { status: 201 });
});
