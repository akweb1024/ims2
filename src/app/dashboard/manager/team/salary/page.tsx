import { auth } from '@/lib/nextauth';
import { getUnifiedSalaries } from '@/lib/team-service';
import UnifiedSalaryTable from './UnifiedSalaryTable';
import { format } from 'date-fns';

export default async function UnifiedSalaryPage({
    searchParams,
}: {
    searchParams: Promise<{ userId?: string }>;
}) {
    const params = await searchParams;
    const session = await auth();
    if (!session?.user?.id) return <div>Unauthorized</div>;

    const salaries = await getUnifiedSalaries(session.user.id, {
        userId: params.userId,
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Salary & Increments</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Review salary structures and increment history across your team
                </p>
            </div>

            <UnifiedSalaryTable salaries={salaries} />
        </div>
    );
}

