import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

// GET: Fetch all onboarding modules for the company
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userCompanyId = (user as any).companyId;

        const modules = await prisma.onboardingModule.findMany({
            where: { companyId: userCompanyId },
            include: { questions: true },
            orderBy: { order: 'asc' }
        });

        return NextResponse.json(modules);
    } catch (error) {
        console.error('Onboarding Modules Fetch Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST: Create a new onboarding module
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { title, type, description, content, departmentId, requiredForDesignation, questions, order } = body;

        const userCompanyId = (user as any).companyId;

        const module = await prisma.onboardingModule.create({
            data: {
                companyId: userCompanyId,
                title,
                type, // COMPANY, ROLE, DEPARTMENT
                description,
                content,
                departmentId,
                requiredForDesignation,
                order: order || 0,
                questions: {
                    create: questions.map((q: any) => ({
                        question: q.question,
                        options: q.options,
                        correctAnswer: q.correctAnswer
                    }))
                }
            },
            include: { questions: true }
        });

        return NextResponse.json(module);
    } catch (error) {
        console.error('Onboarding Module Creation Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
