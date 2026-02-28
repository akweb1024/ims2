import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

/**
 * Standardized Plagiarism Webhook Listener
 * Third-party platforms (like Turnitin, iThenticate, Copyleaks) can send POST payloads here 
 * when a document scan is completed.
 */
export async function POST(req: NextRequest) {
    try {
        const payload = await req.json();
        
        // Example Payload Structure Expected from vendor:
        // { 
        //    "companyId": "uuid",
        //    "articleId": "uuid", 
        //    "status": "COMPLETED", 
        //    "similarityScore": 14, 
        //    "reportUrl": "https://..."
        // }

        const { companyId, articleId, status, similarityScore, reportUrl } = payload;

        if (!companyId || !articleId) {
            return NextResponse.json({ error: 'Missing standard identifying payload descriptors.' }, { status: 400 });
        }

        // 1. Authenticate Request via configured active keys
        const integration = await (prisma as any).companyIntegration.findUnique({
            where: {
                companyId_provider: {
                    companyId,
                    provider: 'PLAGIARISM_SCANNER'
                }
            }
        });

        if (!integration || !integration.isActive) {
             console.warn(`[Webhook] Unconfigured Plagiarism Scanner accessed for company ${companyId}`);
             return NextResponse.json({ error: 'Scanner integration not active for this tenant.' }, { status: 403 });
        }

        // Webhook Secret Validation (Assuming headers pass an x-signature, we validate here)
        const signature = req.headers.get('x-hmac-signature');
        if (signature && integration.key) {
            const hmac = crypto.createHmac('sha256', integration.key);
            const digest = hmac.update(JSON.stringify(payload)).digest('hex');
            if (signature !== digest) {
                return NextResponse.json({ error: 'Invalid Webhook Signature' }, { status: 401 });
            }
        }

        // 2. Update the specific Article with the Plagiarism details
        // Note: Checking if Article model exists, we update the metrics directly.
        // If your schema uses different fields, adjust the data payload below.
        
        const existingArticle = await prisma.article.findUnique({ where: { id: articleId }});

        if (existingArticle) {
            // Update Article or emit a Notification
            await prisma.article.update({
                where: { id: articleId },
                data: {
                    status: similarityScore && similarityScore > 20 ? 'REJECTED' : existingArticle.status, // Auto reject if high!
                    // Assuming you might add plagiarism fields to Article later:
                    // plagiarismScore: similarityScore,
                    // plagiarismReportUrl: reportUrl
                }
            });

            // Create a general audit log for tracking
            await prisma.auditLog.create({
                 data: {
                     action: 'PLAGIARISM_SCAN_COMPLETED',
                     entity: 'ARTICLE',
                     entityId: articleId,
                     changes: { score: similarityScore, report: reportUrl, status }
                 }
            });
        }

        return NextResponse.json({ received: true, processed: true }, { status: 200 });
    } catch (err: any) {
        console.error('Webhook Error:', err);
        return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
    }
}
