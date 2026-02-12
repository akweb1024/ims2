import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { jobPostingSchema, updateJobPostingSchema } from '@/lib/validators/hr';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const showAll = searchParams.get('all') === 'true';
            const queryCompanyId = searchParams.get('companyId');

            let where: any = { status: 'OPEN' };

            if (showAll && ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER', 'HR'].includes(user.role)) {
                where = {}; // Management roles can see all status
            }

            const finalCompanyId = (user.role === 'SUPER_ADMIN' && queryCompanyId) ? queryCompanyId : user.companyId;

            if (finalCompanyId) {
                where.companyId = finalCompanyId;
            }

            const jobs = await prisma.jobPosting.findMany({
                where,
                include: {
                    company: { select: { name: true } },
                    department: { select: { name: true } },
                    _count: { select: { applications: true } }
                },
                orderBy: { createdAt: 'desc' }
            });
            return NextResponse.json(jobs);
        } catch (error: any) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();

            const validation = jobPostingSchema.safeParse(body);
            if (!validation.success) {
                return createErrorResponse(validation.error);
            }

            const { examQuestions, companyId, ...jobData } = validation.data;

            const finalCompanyId = (user.role === 'SUPER_ADMIN' && companyId) ? companyId : user.companyId;

            if (!finalCompanyId) {
                return createErrorResponse('Company association required.', 400);
            }

            const job = await prisma.jobPosting.create({
                data: {
                    companyId: finalCompanyId,
                    title: jobData.title,
                    description: jobData.description,
                    requirements: jobData.requirements,
                    location: jobData.location,
                    salaryRange: jobData.salaryRange,
                    type: jobData.type,
                    status: 'OPEN',
                    departmentId: jobData.departmentId,
                    exam: examQuestions && examQuestions.length > 0 ? {
                        create: {
                            questions: examQuestions,
                            passPercentage: 60, // Default pass percentage
                            timeLimit: 45 // Default time limit
                        }
                    } : undefined
                }
            });

            return NextResponse.json(job);
        } catch (error: any) {
            return createErrorResponse(error);
        }
    }
);

export const PATCH = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();
            const validation = updateJobPostingSchema.safeParse(body);

            if (!validation.success) {
                return createErrorResponse(validation.error);
            }

            const { id, examQuestions, ...updates } = validation.data;
            if (!id) return createErrorResponse('ID is required', 400);

            const job = await prisma.jobPosting.update({
                where: { id },
                data: {
                    ...updates,
                    exam: examQuestions ? {
                        upsert: {
                            create: {
                                questions: examQuestions,
                                passPercentage: 60,
                                timeLimit: 45
                            },
                            update: {
                                questions: examQuestions
                            }
                        }
                    } : undefined
                }
            });

            return NextResponse.json(job);
        } catch (error: any) {
            return createErrorResponse(error);
        }
    }
);
