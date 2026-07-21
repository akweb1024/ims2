import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { canAccessAllCompanies } from '@/lib/company-scope';

const RECRUITER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR', 'MANAGER'];

// A screening belongs to the company of the job posting behind its interview. Users
// without all-company clearance may only act on screenings in their own company.
function canAccessCompany(user: any, companyId: string | null): boolean {
    if (canAccessAllCompanies(user)) return true;
    return !!user.companyId && companyId === user.companyId;
}

export const POST = authorizedRoute(RECRUITER_ROLES, async (req: NextRequest, user, context) => {
    try {
        const params = await context.params;
        const interviewId = params.id;
        const data = await req.json();
        // Expected data: { recommendation, finalNotes }

        const screening = await prisma.interviewScreening.findUnique({
            where: { interviewId },
            include: {
                responses: true,
                template: true,
                interview: {
                    include: { application: { include: { jobPosting: { select: { companyId: true } } } } },
                },
            }
        });

        if (!screening || !canAccessCompany(user, screening.interview?.application?.jobPosting?.companyId ?? null)) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        if (screening.status === 'SUBMITTED') {
            return NextResponse.json({ error: 'Already submitted' }, { status: 400 });
        }

        // Calculate Category Scores & Overall Score
        const categoryScores: Record<string, number> = {};
        const categoryCounts: Record<string, number> = {};
        let overallTotal = 0;
        let overallCount = 0;

        // In a real application, you'd match question IDs from template.questions to get their category.
        // For simplicity, we'll assume `template.questions` is an array of objects `[{ id, category, ... }]`
        const templateQuestions = (screening.template.questions as any[]) || [];
        const questionMap = templateQuestions.reduce((acc, q) => {
            acc[q.id] = q;
            return acc;
        }, {} as Record<string, any>);

        screening.responses.forEach((res: any) => {
            if (res.rating !== null && res.rating !== undefined) {
                const qCategory = questionMap[res.questionId]?.category || 'Uncategorized';
                
                if (!categoryScores[qCategory]) {
                    categoryScores[qCategory] = 0;
                    categoryCounts[qCategory] = 0;
                }
                categoryScores[qCategory] += res.rating;
                categoryCounts[qCategory] += 1;

                overallTotal += res.rating;
                overallCount += 1;
            }
        });

        // Compute averages
        const computedCategoryScores: Record<string, number> = {};
        for (const cat of Object.keys(categoryScores)) {
            computedCategoryScores[cat] = categoryCounts[cat] > 0 
                ? (categoryScores[cat] / categoryCounts[cat]) 
                : 0;
        }

        // Apply weights if defined (simplification: if weights exist, use them, otherwise simple average)
        const templateWeights = (screening.template.weights as Record<string, number>) || {};
        let finalScore = 0;
        let totalWeight = 0;

        if (Object.keys(templateWeights).length > 0) {
            for (const cat of Object.keys(computedCategoryScores)) {
                const w = templateWeights[cat] || 1;
                finalScore += computedCategoryScores[cat] * w;
                totalWeight += w;
            }
            finalScore = totalWeight > 0 ? (finalScore / totalWeight) : 0;
        } else {
            finalScore = overallCount > 0 ? (overallTotal / overallCount) : 0;
        }

        // Update screening state
        const updatedScreening = await prisma.interviewScreening.update({
            where: { id: screening.id },
            data: {
                status: 'SUBMITTED',
                overallScore: finalScore,
                categoryScores: computedCategoryScores,
                recommendation: data.recommendation || 'PENDING',
                submittedBy: user.id,
                submittedAt: new Date()
            }
        });

        // Also update Interview record result if applicable
        const passed = data.recommendation === 'Strong Hire' || data.recommendation === 'Hire';
        await prisma.recruitmentInterview.update({
            where: { id: interviewId },
            data: {
                result: passed ? 'PASSED' : 'REJECTED',
                feedback: data.finalNotes || `Recommendation: ${data.recommendation}, Score: ${finalScore.toFixed(2)}`,
                rating: Math.round(finalScore)
            }
        });

        // Advance the application so the pipeline moves after scoring (previously it stayed
        // in INTERVIEW forever). Only advance from INTERVIEW so we never clobber a later stage;
        // a further round can re-set INTERVIEW via interview scheduling.
        await prisma.jobApplication.updateMany({
            where: { id: screening.applicationId, status: 'INTERVIEW' },
            data: { status: passed ? 'OFFER' : 'REJECTED' },
        });

        return NextResponse.json({ success: true, finalScore, categoryScores: computedCategoryScores });
    } catch (error) {
        console.error('Submit Screening Error:', error);
        return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
    }
});
