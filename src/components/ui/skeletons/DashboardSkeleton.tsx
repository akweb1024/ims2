import CardSkeleton from './CardSkeleton';
import TableSkeleton from './TableSkeleton';

/**
 * Dashboard Skeleton Loader
 * Displays a complete dashboard skeleton with stats and table
 */

export default function DashboardSkeleton() {
    return (
        <div className="space-y-8 animate-pulse">
            {/* Page Header */}
            <div className="space-y-2">
                <div className="h-10 bg-gray-300 rounded w-1/4" />
                <div className="h-5 bg-gray-200 rounded w-1/3" />
            </div>

            {/* Stats Cards */}
            <CardSkeleton count={4} variant="stat" />

            {/* Charts/Graphs Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <div className="h-6 bg-gray-300 rounded w-1/3 mb-4" />
                    <div className="h-64 bg-gray-100 rounded-lg" />
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <div className="h-6 bg-gray-300 rounded w-1/3 mb-4" />
                    <div className="h-64 bg-gray-100 rounded-lg" />
                </div>
            </div>

            {/* Data Table */}
            <div>
                <div className="h-6 bg-gray-300 rounded w-1/4 mb-4" />
                <TableSkeleton rows={5} columns={5} />
            </div>
        </div>
    );
}
