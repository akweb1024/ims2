import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

// GET: Fetch all onboarding modules for the company (and Global)
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MANAGER', 'TEAM_LEADER'],
    async (req: NextRequest, user) => {
        try {
            if (!user.companyId) return createErrorResponse('Company association required', 403);

            const modules = await prisma.onboardingModule.findMany({
                where: {
                    isActive: true, // filteredModules usually wants active ones? Or maybe all for manager? existing was just companyId.
                    // Let's keep it simple and consistent with previous behavior + Global
                    OR: [
                        { companyId: user.companyId },
                        { companyId: null }
                    ]
                },
                include: { questions: true },
                orderBy: { order: 'asc' }
            });

            return NextResponse.json(modules);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// POST: Create a new onboarding module
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            if (!user.companyId) return createErrorResponse('Company association required', 403);

            const body = await req.json();
            const { title, type, description, content, departmentId, requiredForDesignation, questions, order } = body;

            if (!title || !type || !content) {
                return createErrorResponse('Missing required fields', 400);
            }

            const newModule = await prisma.onboardingModule.create({
                data: {
                    companyId: type === 'GLOBAL' ? null : user.companyId,
                    title,
                    type, // COMPANY, GLOBAL, ROLE, DEPARTMENT
                    description,
                    content,
                    departmentId: departmentId || null,
                    requiredForDesignation: requiredForDesignation || null,
                    order: order || 0,
                    questions: {
                        create: Array.isArray(questions) ? questions.map((q: any) => ({
                            question: q.question,
                            options: q.options,
                            correctAnswer: parseInt(q.correctAnswer)
                        })) : []
                    }
                },
                include: { questions: true }
            });

            return NextResponse.json(newModule);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// PATCH: Update an onboarding module
export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const { id, questions, ...updateData } = body;

            if (!id) return createErrorResponse('ID is required', 400);

            // Update module
            const updatedModule = await prisma.onboardingModule.update({
                where: { id },
                data: {
                    ...updateData,
                    questions: questions ? {
                        deleteMany: {},
                        create: questions.map((q: any) => ({
                            question: q.question,
                            options: q.options,
                            correctAnswer: parseInt(q.correctAnswer)
                        }))
                    } : undefined
                },
                include: { questions: true }
            });

            return NextResponse.json(updatedModule);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

// DELETE: Remove an onboarding module
export const DELETE = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const id = searchParams.get('id');

            if (!id) return createErrorResponse('ID is required', 400);

            await prisma.onboardingModule.delete({
                where: { id }
            });

            return NextResponse.json({ message: 'Module deleted successfully' });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
