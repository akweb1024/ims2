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

        const body = await req.json();
        const { customerId, customerName, healthScore, reasons } = body;

        if (!customerId || !customerName) {
            return NextResponse.json({ error: 'Missing customer details' }, { status: 400 });
        }

        // Obtain secure API Key from integrations, fallback to environment variable
        let apiKey = process.env.GEMINI_API_KEY || '';
        try {
            const aiIntegration = await getCompanyIntegration(companyId, 'GEMINI');
            if (aiIntegration?.isActive && aiIntegration.key) {
                apiKey = aiIntegration.key;
            }
        } catch (e) {
            console.warn('Could not read companyIntegration table, falling back to process.env:', e);
        }

        if (!apiKey) {
            return NextResponse.json(
                { error: 'Gemini AI API Key not configured. Configure the key via Settings > Integrations or contact Admin.' },
                { status: 403 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `You are a premium Customer Success Director & AI retention analyst.
Generate a tailored retention strategy proposal and outreach email for the following client:
Customer Name: ${customerName}
Current Health Score: ${healthScore}/100
Churn Risk Factor: ${healthScore < 60 ? 'HIGH' : 'MODERATE'}
Known pain points/reasons:
${reasons?.map((r: string) => `- ${r}`).join('\n') || '- No active subscription plans / pending invoices.'}

Return your response in standard JSON format exactly. Do not wrap in markdown code blocks like \`\`\`json. Return a single JSON object matching this schema:
{
    "summary": "Short executive summary of relationship health status and why they are at risk.",
    "strategies": [
        {
            "title": "Strategy title",
            "impact": "HIGH | MEDIUM",
            "action": "Concrete details of what the account manager should do (e.g. waive overdue fee, schedule a call, adjust subscription price)."
        }
    ],
    "emailSubject": "Compelling subject line for customer outreach",
    "emailBody": "Personalized, warm email body text addressing the customer, offering to help resolve outstanding issues, proposing a value-add offer, and inviting them to a direct meeting. Sign off as 'Your Success Team'."
}`;

        const result = await model.generateContent(prompt);
        let responseText = result.response.text().trim();

        // Clean up markdown block wraps if model outputs them anyway
        if (responseText.startsWith('```json')) {
            responseText = responseText.replace(/^```json/, '').replace(/```$/, '').trim();
        } else if (responseText.startsWith('```')) {
            responseText = responseText.replace(/^```/, '').replace(/```$/, '').trim();
        }

        try {
            const parsed = JSON.parse(responseText);
            return NextResponse.json(parsed);
        } catch (parseError) {
            console.error('Gemini output was not valid JSON:', responseText);
            return NextResponse.json({
                summary: `This client has a health score of ${healthScore}%. Action is needed to secure subscription renewals and clear outstanding balances.`,
                strategies: [
                    {
                        title: 'Direct Client Outreach',
                        impact: 'HIGH',
                        action: 'Schedule a call to discuss pricing structures or payment delays.'
                    },
                    {
                        title: 'Custom Invoicing Waiver',
                        impact: 'MEDIUM',
                        action: 'Offer temporary invoice extensions or waived interest for unpaid fees.'
                    }
                ],
                emailSubject: `Checking in from the Customer Support Team`,
                emailBody: `Hello ${customerName},\n\nWe value your partnership and wanted to reach out to ensure you have everything you need. Let us know if we can schedule a quick 10-minute check-in call.\n\nWarm regards,\nYour Success Team`
            });
        }

    } catch (error: any) {
        console.error('CRM Retention Plan Generation Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

// Style guide accessibility compliance helper comment: aria-label placeholder label
