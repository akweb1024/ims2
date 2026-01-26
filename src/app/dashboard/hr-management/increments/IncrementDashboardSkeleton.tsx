export default function IncrementDashboardSkeleton() {
    return (
        <div className="p-8 space-y-6 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex justify-between items-center">
                <div>
                    <div className="h-8 w-64 bg-secondary-200 rounded mb-2"></div>
                    <div className="h-5 w-96 bg-secondary-100 rounded"></div>
                </div>
                <div className="h-10 w-40 bg-secondary-200 rounded"></div>
            </div>

            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="card-premium p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-secondary-100 rounded-xl"></div>
                            <div className="flex-1">
                                <div className="h-3 w-16 bg-secondary-100 rounded mb-2"></div>
                                <div className="h-8 w-12 bg-secondary-300 rounded"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters Skeleton */}
            <div className="card-premium p-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 h-10 bg-secondary-100 rounded"></div>
                    <div className="w-48 h-10 bg-secondary-100 rounded"></div>
                </div>
            </div>

            {/* Table Skeleton */}
            <div className="card-premium overflow-hidden">
                <div className="p-4 bg-secondary-50">
                    <div className="h-6 w-full bg-secondary-200 rounded"></div>
                </div>
                <div className="divide-y divide-secondary-100">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="p-6">
                            <div className="grid grid-cols-7 gap-4">
                                <div className="space-y-2">
                                    <div className="h-5 w-32 bg-secondary-200 rounded"></div>
                                    <div className="h-4 w-40 bg-secondary-100 rounded"></div>
                                </div>
                                <div className="h-5 w-24 bg-secondary-100 rounded"></div>
                                <div className="h-5 w-24 bg-secondary-100 rounded"></div>
                                <div className="space-y-1">
                                    <div className="h-5 w-20 bg-secondary-200 rounded"></div>
                                    <div className="h-4 w-16 bg-secondary-100 rounded"></div>
                                </div>
                                <div className="h-6 w-32 bg-secondary-100 rounded-full"></div>
                                <div className="h-5 w-24 bg-secondary-100 rounded"></div>
                                <div className="flex gap-2">
                                    <div className="h-8 w-8 bg-secondary-100 rounded"></div>
                                    <div className="h-8 w-8 bg-secondary-100 rounded"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
