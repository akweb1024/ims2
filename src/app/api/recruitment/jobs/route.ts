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

            // Jobs are global by default; recruiters see all postings (global +
            // every company's). An optional companyId narrows the list, and the
            // 'GLOBAL' sentinel isolates company-less postings.
            if (queryCompanyId === 'GLOBAL') {
                where.companyId = null;
            } else if (queryCompanyId) {
                where.companyId = queryCompanyId;
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

            // Global by default; the poster may optionally pin the job to a
            // specific company. Empty string / null both mean global.
            const finalCompanyId = companyId ? companyId : null;

            const job = await prisma.jobPosting.create({
                data: {
                    companyId: finalCompanyId,
                    title: jobData.title,
                    description: jobData.description,
                    requirements: jobData.requirements,
                    qualifications: jobData.qualifications,
                    tags: jobData.tags ?? [],
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

            // Only touch companyId when the field was actually sent (partial
            // updates like close/reopen omit it). '' clears it → global.
            if ('companyId' in updates) {
                (updates as any).companyId = updates.companyId ? updates.companyId : null;
            }

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
