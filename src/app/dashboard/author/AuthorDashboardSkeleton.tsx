export default function AuthorDashboardSkeleton() {
    return (
        <div className="p-6 space-y-6 pb-20 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex justify-between items-center">
                <div>
                    <div className="h-8 w-64 bg-secondary-200 rounded mb-2"></div>
                    <div className="h-4 w-96 bg-secondary-100 rounded"></div>
                </div>
                <div className="h-10 w-40 bg-secondary-200 rounded"></div>
            </div>

            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="card-premium p-4">
                        <div className="h-8 w-16 bg-secondary-300 rounded mb-2"></div>
                        <div className="h-3 w-20 bg-secondary-100 rounded"></div>
                    </div>
                ))}
            </div>

            {/* Manuscripts List Skeleton */}
            <div className="card-premium overflow-hidden">
                <div className="p-4 border-b border-secondary-100">
                    <div className="h-6 w-40 bg-secondary-200 rounded"></div>
                </div>
                <div className="divide-y divide-secondary-100">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="h-6 w-64 bg-secondary-200 rounded"></div>
                                        <div className="h-6 w-24 bg-secondary-100 rounded-full"></div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="h-4 w-32 bg-secondary-100 rounded"></div>
                                        <div className="h-4 w-48 bg-secondary-100 rounded"></div>
                                        <div className="h-4 w-32 bg-secondary-100 rounded"></div>
                                    </div>
                                    <div className="h-12 w-full bg-secondary-100 rounded"></div>
                                </div>
                                <div className="h-10 w-28 bg-secondary-200 rounded"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
