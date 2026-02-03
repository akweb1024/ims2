import { Suspense } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Clock, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import Link from 'next/link';
import { StageAssignment } from '@prisma/client';

async function getMyTasks() {
    const user = await getAuthenticatedUser();
    if (!user) return [];

    return await prisma.stageAssignment.findMany({
        where: { assigneeId: user.id },
        include: {
            article: {
                select: {
                    id: true,
                    title: true,
                    manuscriptId: true,
                    manuscriptStatus: true,
                    journal: { select: { name: true } }
                }
            },
            assignedBy: { select: { name: true } }
        },
        orderBy: { assignedAt: 'desc' }
    });
}

export const dynamic = 'force-dynamic';

export default async function MyTasksPage() {
    const tasks = await getMyTasks();

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                <header>
                    <h1 className="text-2xl font-black text-secondary-900">My Tasks</h1>
                    <p className="text-sm text-secondary-600 mt-1">Manage your assigned publication duties</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tasks.length === 0 ? (
                        <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-secondary-200 border-dashed">
                            <FileText className="w-12 h-12 text-secondary-300 mx-auto mb-3" />
                            <h3 className="text-lg font-bold text-secondary-900">No Pending Tasks</h3>
                            <p className="text-secondary-500">You&apos;re all caught up! Great job.</p>
                        </div>
                    ) : (
                        tasks.map((task: any) => (
                            <div key={task.id} className="bg-white rounded-xl p-5 border border-secondary-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wide border ${task.status === 'COMPLETED' ? 'bg-green-100 text-green-700 border-green-200' :
                                        task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                            'bg-secondary-100 text-secondary-700 border-secondary-200'
                                        }`}>
                                        {task.stage.replace(/_/g, ' ')}
                                    </span>
                                    {task.dueDate && (
                                        <span className="flex items-center gap-1 text-xs font-bold text-orange-600">
                                            <Clock size={12} />
                                            {new Date(task.dueDate).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>

                                <h3 className="font-bold text-secondary-900 mb-1 line-clamp-2">{task.article.title}</h3>
                                <p className="text-xs text-secondary-500 font-mono mb-4">{task.article.manuscriptId}</p>

                                <div className="text-sm text-secondary-600 bg-secondary-50 p-3 rounded-lg mb-4">
                                    <span className="font-bold text-xs uppercase text-secondary-400 block mb-1">Instructions</span>
                                    {task.comments || 'No specific instructions.'}
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-secondary-100">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
                                            {task.assignedBy.name.charAt(0)}
                                        </div>
                                        <span className="text-xs text-secondary-500">Assigned by {task.assignedBy.name}</span>
                                    </div>
                                    <Link href={`/dashboard/author/manuscripts/${task.article.id}`} className="btn-secondary text-xs px-3 py-1.5">
                                        View Article
                                    </Link>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
