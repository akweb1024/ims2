import { auth } from '@/lib/nextauth';
import { getUnifiedWorkReports } from '@/lib/team-service';
import WorkReportsTable from './WorkReportsTable'; // We need a way to fetch data on client or pass initial data
// Actually, since it was a Server Component, upgrading it to Client Component to hold state is tricky if we want to keep server fetching.
// Better approach: Keep Page as Server Component, move the Table and Modal to a new Client Component `WorkReportsTable`.

export default async function UnifiedWorkReportsPage({
    searchParams,
}: {
    searchParams: Promise<{ startDate?: string; endDate?: string; userId?: string; status?: string }>;
}) {
    const params = await searchParams;
    const session = await auth();
    if (!session?.user?.id) return <div>Unauthorized</div>;

    const reports = await getUnifiedWorkReports(session.user.id, {
        startDate: params.startDate,
        endDate: params.endDate,
        userId: params.userId,
        status: params.status,
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Work Reports</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Review and approve daily work reports from your team
                </p>
            </div>

            <WorkReportsTable reports={reports} />
        </div>
    );
}
