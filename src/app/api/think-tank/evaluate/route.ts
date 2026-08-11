import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCompanyIntegration } from '@/lib/integration-secrets';
import { getSessionUser } from '@/lib/session';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const companyId = user.companyId || (await prisma.company.findFirst())?.id;
        if (!companyId) {
            return NextResponse.json({ error: 'No active company context' }, { status: 400 });
        }

        // Fetch all ideas for company
        const ideas = await prisma.thinkTankIdea.findMany({
            where: { companyId, reviewStage: { in: ['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'APPROVED'] } },
            select: {
                id: true,
                topic: true,
                description: true,
                category: true,
                weightedScore: true
            }
        });

        if (ideas.length === 0) {
            return NextResponse.json({
                themes: [],
                evaluations: {},
                message: 'No active ideas found to evaluate.'
            });
        }

        // Fetch Gemini key
        let apiKey = process.env.GEMINI_API_KEY || '';
        try {
            const aiIntegration = await getCompanyIntegration(companyId, 'GEMINI');
            if (aiIntegration?.isActive && aiIntegration.key) {
                apiKey = aiIntegration.key;
            }
        } catch (e) {
            console.warn(e);
        }

        if (!apiKey) {
            return NextResponse.json({ error: 'Gemini API key is not configured.' }, { status: 403 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `You are a Chief Innovation Officer & Venture Architect AI.
We have ${ideas.length} innovation proposals submitted by our workforce.
Here is the raw list:
${JSON.stringify(ideas)}

Analyze these ideas and perform two actions:
1. Group/cluster them into 2-4 primary strategic themes (e.g., "Operations Automation", "Customer Experience Enhancement", "Revenue Operations Upgrade"). Give each theme a brief description and associate matching idea IDs.
2. For each idea, estimate:
   - "estimatedBudget": Dev resource requirement in INR (e.g. ₹50,000 to ₹5,000,000) or hours.
   - "projectedROI": Estimated yield or savings (e.g. "Save 15 support hours per week", "Boost customer satisfaction score by 12%").
   - "readinessScore": Feasibility index from 0 to 100 based on standard tech complexity.

Return your response in standard JSON format exactly. Do not wrap in markdown code blocks like \`\`\`json. Return a single JSON object matching this schema:
{
    "themes": [
        {
            "name": "Theme Name",
            "description": "Theme description and relevance",
            "ideaIds": ["idea-id-1", "idea-id-2"]
        }
    ],
    "evaluations": {
        "idea-id-1": {
            "estimatedBudget": "₹1,50,000",
            "projectedROI": "Save 10 hours/week",
            "readinessScore": 85
        }
    }
}`;

        const result = await model.generateContent(prompt);
        let responseText = result.response.text().trim();

        if (responseText.startsWith('```json')) {
            responseText = responseText.replace(/^```json/, '').replace(/```$/, '').trim();
        } else if (responseText.startsWith('```')) {
            responseText = responseText.replace(/^```/, '').replace(/```$/, '').trim();
        }

        let parsed: any;
        try {
            parsed = JSON.parse(responseText);
        } catch {
            // Previously this fell back to a fabricated evaluation — a Math.random()
            // readiness score, a flat ₹1,20,000 budget and a generic ROI line — in the same
            // response shape as a real one, so nothing downstream could tell that the
            // numbers had been invented. Ideas were rankable, and fundable, on a rolled
            // number. Fail loudly instead: an evaluation we could not compute is not an
            // evaluation.
            console.error('Failed to parse Gemini evaluation output:', responseText);
            return NextResponse.json(
                { error: 'The AI returned a response we could not read. No scores were saved — try running the evaluation again.' },
                { status: 502 }
            );
        }

        // Only ever write back to the ideas we fetched for this company. The ids come from
        // the model's output, so an echoed or hallucinated id must not be able to reach
        // another company's row.
        const ownIdeaIds = new Set(ideas.map((i) => i.id));

        for (const ideaId of Object.keys(parsed.evaluations || {})) {
            if (!ownIdeaIds.has(ideaId)) continue;

            const evalData = parsed.evaluations[ideaId] || {};
            const readinessScore =
                typeof evalData.readinessScore === 'number' && Number.isFinite(evalData.readinessScore)
                    ? Math.max(0, Math.min(100, Math.round(evalData.readinessScore)))
                    : null;

            await prisma.thinkTankIdea.update({
                where: { id: ideaId },
                data: {
                    // Leave the stored score untouched when the model omitted one, rather
                    // than stamping a default 70 that reads as a real measurement.
                    ...(readinessScore !== null ? { ideaReadinessScore: readinessScore } : {}),
                    metadata: {
                        estimatedBudget: evalData.estimatedBudget ?? null,
                        projectedROI: evalData.projectedROI ?? null,
                        readinessScore
                    }
                }
            });
        }

        return NextResponse.json(parsed);

    } catch (error: any) {
        console.error('Think Tank Evaluation API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
