import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { workPlanId, content } = body;

        if (!workPlanId || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const comment = await prisma.workPlanComment.create({
            data: {
                workPlanId,
                userId: user.id,
                content
            },
            include: {
                user: {
                    select: { name: true, email: true }
                }
            }
        });

        // Optional: Trigger notification to employee
        const plan = await prisma.workPlan.findUnique({
            where: { id: workPlanId },
            include: { employee: true }
        });

        if (plan && plan.employee.userId !== user.id) {
            await (prisma as any).notification.create({
                data: {
                    userId: plan.employee.userId,
                    title: 'New Comment on Work Plan',
                    message: `${(user as any).name || (user as any).email} commented on your plan for ${new Date(plan.date).toLocaleDateString()}`,
                    type: 'INFO'
                }
            });
        }

        return NextResponse.json(comment);
    } catch (error) {
        console.error('Work Plan Comment POST Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
