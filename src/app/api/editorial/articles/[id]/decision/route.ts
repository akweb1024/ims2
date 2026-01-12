import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { createNotification } from '@/lib/notifications';
import { generateCertificate } from '@/lib/certificate-utils';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getAuthenticatedUser();
        const { id } = await params;

        if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'EDITOR'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { status } = await req.json();

        if (!['ACCEPTED', 'REJECTED', 'REVISION_REQUESTED', 'PUBLISHED'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const article = await prisma.article.update({
            where: { id },
            data: {
                status,
                ...(status === 'ACCEPTED' ? { acceptanceDate: new Date() } : {}),
                ...(status === 'PUBLISHED' ? { publicationDate: new Date() } : {})
            },
            include: { authors: true }
        });

        if (status === 'PUBLISHED') {
            // Generate Certificate for Authors
            for (const author of article.authors) {
                // Try to find user by email
                const authorUser = await prisma.user.findUnique({ where: { email: author.email } });
                if (authorUser) {
                    await generateCertificate({
                        userId: authorUser.id,
                        type: 'AUTHOR',
                        title: 'Certificate of Publication',
                        description: `This is to certify that ${author.name} has published the article "${article.title}" in our journal.`
                    });
                }
            }
        }

        return NextResponse.json({ success: true, article });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
