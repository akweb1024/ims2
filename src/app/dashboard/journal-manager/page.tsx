import { Suspense } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import JournalManagerBoard from '@/components/dashboard/journals/JournalManagerBoard';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

async function getManuscripts() {
    const user = await getAuthenticatedUser();
    if (!user) return [];

    // Fetch all manuscripts if admin, or meaningful checks if needed
    // For now, assuming Journal Manager can see all or scoped to their journals
    return await prisma.article.findMany({
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
        <DashboardLayout>
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
        </DashboardLayout>
    );
}
