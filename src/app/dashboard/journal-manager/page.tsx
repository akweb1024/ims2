import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

import JournalManagerBoard from '@/components/dashboard/journals/JournalManagerBoard';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { resolveJournalScope } from '@/lib/journal-scope';

async function getManuscripts() {
    const user = await getAuthenticatedUser();
    if (!user) return [];

    // A journal manager sees the journals assigned to them; the catalogue-wide roles
    // (SUPER_ADMIN, ADMIN, EDITOR_IN_CHIEF) see everything. This board previously ran with
    // no where clause at all, so it returned every journal's submissions to whoever opened
    // it — the same scoping the manuscripts dashboard and the plagiarism and quality
    // queues have always applied.
    const scope = await resolveJournalScope(prisma, user);

    return await prisma.article.findMany({
        where: scope,
        include: {
            journal: { select: { name: true } },
            authors: { select: { name: true } }
        },
        orderBy: { submissionDate: 'desc' }
    });
}

export default async function JournalManagerPage() {
    const manuscripts = await getManuscripts();

    return (
        <>
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-black text-secondary-900">Journal Workflow Manager</h1>
                        <p className="text-sm text-secondary-600 mt-1">Oversee article stages and assignments</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
                    <JournalManagerBoard initialManuscripts={manuscripts} />
                </div>
            </div>
        </>
    );
}
