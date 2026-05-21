import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';

export async function POST(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user || (!user.companyId && user.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const companyId = user.companyId || (await prisma.company.findFirst())?.id;
        if (!companyId) {
            return NextResponse.json({ error: 'No active company found for context.' }, { status: 400 });
        }

        const body = await req.json();
        const { type, data } = body;

        if (!type || !data) {
            return NextResponse.json({ error: 'Missing type or data' }, { status: 400 });
        }

        if (type === 'INVOICE') {
            const total = parseFloat(data.totalAmount || 0);
            const taxRate = parseFloat(data.taxRate || 18.0);
            const amount = parseFloat((total / (1 + taxRate / 100)).toFixed(2));
            const tax = parseFloat((total - amount).toFixed(2));

            // Generate unique invoice number if not provided or collision
            let invoiceNum = data.invoiceNumber || `AI-INV-${Date.now().toString().slice(-6)}`;
            const existingInvoice = await prisma.invoice.findUnique({
                where: { invoiceNumber: invoiceNum }
            });
            if (existingInvoice) {
                invoiceNum = `${invoiceNum}-${Math.floor(Math.random() * 1000)}`;
            }

            const invoice = await prisma.invoice.create({
                data: {
                    invoiceNumber: invoiceNum,
                    invoiceDate: data.date ? new Date(data.date) : new Date(),
                    dueDate: data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 15 * 86400000),
                    currency: data.currency || 'INR',
                    amount,
                    tax,
                    total,
                    status: 'UNPAID',
                    description: `Extracted Vendor Invoice: ${data.vendorName || 'Unknown Vendor'}`,
                    lineItems: data.lineItems || [],
                    companyId,
                    taxRate
                }
            });

            return NextResponse.json({ success: true, message: 'Invoice saved successfully', id: invoice.id });
        }

        if (type === 'RESUME') {
            // Find or create a default JobPosting for the company
            let jobPosting = await prisma.jobPosting.findFirst({
                where: { companyId, status: 'OPEN' }
            });

            if (!jobPosting) {
                jobPosting = await prisma.jobPosting.create({
                    data: {
                        companyId,
                        title: 'General AI Ingested Openings',
                        description: 'Pipeline for automatically ingested candidates and smart resume matches.',
                        status: 'OPEN',
                        type: 'FULL_TIME',
                        salaryRange: 'Negotiable'
                    }
                });
            }

            const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Ingested Applicant';
            const yearsOfExp = parseInt(data.experienceYears || 0);
            const matchScore = Math.min(100, Math.max(30, 40 + (yearsOfExp * 6)));

            const application = await prisma.jobApplication.create({
                data: {
                    jobPostingId: jobPosting.id,
                    applicantName: fullName,
                    applicantEmail: data.email || `candidate-${Date.now()}@example.com`,
                    applicantPhone: data.phone || null,
                    aiMatchScore: matchScore,
                    aiTags: data.skills || [],
                    status: 'APPLIED',
                    notes: `Education: ${data.educationLevel || 'N/A'}. Last Employer: ${data.lastEmployer || 'N/A'}. Location: ${data.location || 'N/A'}.`
                }
            });

            return NextResponse.json({ success: true, message: 'Resume applicant saved successfully', id: application.id });
        }

        return NextResponse.json({ error: 'Unsupported type' }, { status: 400 });

    } catch (error: any) {
        console.error('Commit Document Extraction Error:', error);
        return NextResponse.json({ error: error.message || 'Verification and commit failed' }, { status: 500 });
    }
}
