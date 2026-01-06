import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

// Helper to replace placeholders
const hydrateTemplate = (content: string, vars: Record<string, string>) => {
    let output = content;
    // Replace {{key}}
    Object.keys(vars).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        output = output.replace(regex, vars[key] || '');
    });
    return output;
};

// POST: Issue a document to an employee
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { templateId, employeeId } = body;

        const template = await prisma.documentTemplate.findUnique({ where: { id: templateId } });
        const employee = await prisma.employeeProfile.findUnique({
            where: { id: employeeId },
            include: { user: true }
        });

        if (!template || !employee) {
            return NextResponse.json({ error: 'Template or Employee not found' }, { status: 404 });
        }

        // Prepare Variables
        const vars = {
            name: employee.user.name || employee.user.email.split('@')[0],
            email: employee.user.email,
            designation: employee.designation || 'Specialist',
            date: new Date().toLocaleDateString(),
            salary: (employee.baseSalary || 0).toString(),
            address: employee.address || '',
            // Add company vars via user's company context if needed
        };

        const resolvedContent = hydrateTemplate(template.content, vars);

        const doc = await prisma.digitalDocument.create({
            data: {
                templateId,
                employeeId,
                title: template.title,
                content: resolvedContent,
                status: 'PENDING'
            }
        });

        return NextResponse.json(doc);
    } catch (error) {
        console.error('Issue Document Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PATCH: Employee Sign
export async function PATCH(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { id, action } = body; // action = SIGN

        if (action !== 'SIGN') return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

        const doc = await prisma.digitalDocument.findUnique({
            where: { id },
            include: { employee: true }
        });

        if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

        // Verify ownership
        if (doc.employee.userId !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const updated = await prisma.digitalDocument.update({
            where: { id },
            data: {
                status: 'SIGNED',
                signedAt: new Date(),
                signatureIp: req.headers.get('x-forwarded-for') || 'ip-unknown'
            }
        });

        return NextResponse.json(updated);

    } catch (error) {
        console.error('Sign Document Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
