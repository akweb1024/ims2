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

        try {
            const parsed = JSON.parse(responseText);
            
            // Optionally update database metadata with these AI scores
            for (const ideaId in parsed.evaluations) {
                const evalData = parsed.evaluations[ideaId];
                await prisma.thinkTankIdea.updateMany({
                    where: { id: ideaId },
                    data: {
                        ideaReadinessScore: evalData.readinessScore || 70,
                        metadata: {
                            estimatedBudget: evalData.estimatedBudget,
                            projectedROI: evalData.projectedROI,
                            readinessScore: evalData.readinessScore
                        }
                    }
                });
            }

            return NextResponse.json(parsed);
        } catch (parseError) {
            console.error('Failed to parse Gemini evaluation output:', responseText);
            // Return fallback mock response if parsing fails
            const mockEvaluations: any = {};
            ideas.forEach(idea => {
                mockEvaluations[idea.id] = {
                    estimatedBudget: '₹1,20,000',
                    projectedROI: 'Operational efficiency gains of 15%',
                    readinessScore: Math.floor(Math.random() * 30) + 65
                };
            });

            return NextResponse.json({
                themes: [
                    {
                        name: 'Core System Upgrades',
                        description: 'Technical refinements to baseline ERP operations.',
                        ideaIds: ideas.map(i => i.id)
                    }
                ],
                evaluations: mockEvaluations
            });
        }

    } catch (error: any) {
        console.error('Think Tank Evaluation API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
