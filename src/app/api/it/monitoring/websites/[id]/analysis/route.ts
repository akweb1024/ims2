import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { createErrorResponse } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const user = await getAuthenticatedUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const website = await prisma.websiteMonitor.findUnique({
            where: { id }
        });

        if (!website) {
            return NextResponse.json({ error: 'Website monitor not found' }, { status: 404 });
        }

        // Generate high-fidelity mock audit data
        // In a real scenario, this would call external APIs like Lighthouse, SEMRush, etc.
        const seed = website.url.length + website.name.length;
        const getScore = (base: number, range: number) => Math.min(100, base + (seed % range));

        const audit = {
            id: website.id,
            url: website.url,
            name: website.name,
            overallScore: getScore(75, 20),
            seo: {
                score: getScore(80, 15),
                title: website.name.length > 10 ? "Optimal Length" : "Too Short",
                metaDescription: "Optimized (155 chars)",
                headers: { h1: 1, h2: 4, h3: 12 },
                backlinks: 250 + (seed * 10),
                keywords: ["management", "business", "portal", "cloud"],
                loadTime: (0.8 + (seed % 10) / 10).toFixed(2) + "s",
                mobileFriendly: true
            },
            aeo: { // Answer Engine Optimization
                score: getScore(65, 25),
                directAnswers: 12,
                featuredSnippets: 2,
                voiceSearchScore: getScore(70, 20),
                readability: "Clear & Concise",
                structuredDataBreadcrumbs: true
            },
            geo: { // Generative Engine Optimization (AI Search)
                score: getScore(60, 30),
                aiVisibility: "Medium",
                contextualRelevance: getScore(75, 15),
                citationProbability: "High",
                brandAuthority: 4.2
            },
            schema: {
                score: getScore(85, 15),
                types: ["Organization", "WebSite", "BreadcrumbList", "Product"],
                isVALID: true,
                errors: 0,
                warnings: seed % 3,
                lastValidated: new Date().toISOString()
            },
            security: {
                score: getScore(90, 10),
                sslStatus: "Valid",
                sslExpiry: "245 Days",
                securityHeaders: {
                    csp: true,
                    hsts: true,
                    xfo: true
                },
                vulnerabilities: 0,
                malwareScan: "Clean"
            },
            traffic: {
                score: getScore(70, 20),
                monthlyVisits: 15000 + (seed * 100),
                bounceRate: "35.4%",
                avgSessionDuration: "4m 22s",
                topChannels: ["Direct", "Organic Search", "Referral"],
                growth: "+12.5% MoM"
            },
            timestamp: new Date().toISOString()
        };

        return NextResponse.json(audit);
    } catch (error) {
        console.error('Website Analysis Error:', error);
        return createErrorResponse(error);
    }
}
