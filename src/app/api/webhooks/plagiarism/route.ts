import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCompanyIntegration } from '@/lib/integration-secrets';
import crypto from 'crypto';

/**
 * Standardized Plagiarism Webhook Listener
 * Third-party platforms (like Turnitin, iThenticate, Copyleaks) can send POST payloads here 
 * when a document scan is completed.
 */
export async function POST(req: NextRequest) {
    try {
        // Read the raw body so the HMAC is verified against the exact bytes the vendor
        // signed. Re-serializing a parsed object (JSON.stringify(await req.json())) can
        // reorder keys / drop whitespace and produce a different digest than the sender's.
        const rawBody = await req.text();

        let payload: any;
        try {
            payload = JSON.parse(rawBody);
        } catch {
            return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
        }

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
        const integration = await getCompanyIntegration(companyId, 'PLAGIARISM_SCANNER');

        if (!integration || !integration.isActive) {
             console.warn(`[Webhook] Unconfigured Plagiarism Scanner accessed for company ${companyId}`);
             return NextResponse.json({ error: 'Scanner integration not active for this tenant.' }, { status: 403 });
        }

        // 2. Webhook Signature Validation — MANDATORY (fail closed). Without this, an
        // attacker who omits the signature header could forge scan verdicts and auto-reject
        // arbitrary manuscripts. A missing secret or missing/invalid signature is rejected.
        const secret = integration.key;
        if (!secret) {
            console.warn(`[Webhook] Plagiarism Scanner for company ${companyId} has no HMAC secret configured; rejecting.`);
            return NextResponse.json({ error: 'Webhook secret not configured for this tenant.' }, { status: 403 });
        }

        const signature = req.headers.get('x-hmac-signature');
        if (!signature) {
            return NextResponse.json({ error: 'Missing Webhook Signature' }, { status: 401 });
        }

        const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
        const signatureBuf = Buffer.from(signature, 'utf8');
        const digestBuf = Buffer.from(digest, 'utf8');
        if (signatureBuf.length !== digestBuf.length || !crypto.timingSafeEqual(signatureBuf, digestBuf)) {
            return NextResponse.json({ error: 'Invalid Webhook Signature' }, { status: 401 });
        }

        // 3. Update the specific Article with the Plagiarism details
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
