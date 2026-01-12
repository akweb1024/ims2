import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export async function generateCertificate({
    userId,
    recipientName,
    type,
    title,
    description,
    courseId,
    enrollmentId
}: {
    userId: string;
    recipientName?: string;
    type: 'REVIEWER' | 'EDITOR' | 'AUTHOR' | 'BEST_PAPER' | 'CONFERENCE_PARTICIPATION' | 'COURSE_COMPLETION';
    title: string;
    description: string;
    courseId?: string;
    enrollmentId?: string;
}) {
    // Check if certificate already exists? 
    // For Reviewers/Authors we might have multiple, so we don't strictly de-dupe except maybe on same entity (like same article) which we don't track on cert model explicitly besides description or custom title.
    // For now, allow multiple.

    const verificationCode = uuidv4().substring(0, 8).toUpperCase();

    // If recipient name is missing, fetch from User
    let name = recipientName;
    if (!name) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
        name = user?.name || user?.email || 'Valued Contributor';
    }

    const cert = await prisma.certificate.create({
        data: {
            userId,
            recipientName: name,
            type,
            title,
            description,
            verificationCode,
            enrollmentId,
            courseId
        }
    });

    return cert;
}
