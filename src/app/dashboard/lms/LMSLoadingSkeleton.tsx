export default function LMSLoadingSkeleton() {
    return (
        <div className="space-y-8 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex justify-between items-center">
                <div>
                    <div className="h-8 w-64 bg-secondary-200 rounded mb-2"></div>
                    <div className="h-4 w-96 bg-secondary-100 rounded"></div>
                </div>
                <div className="flex gap-4">
                    <div className="h-10 w-48 bg-secondary-200 rounded"></div>
                    <div className="h-10 w-32 bg-secondary-200 rounded"></div>
                </div>
            </div>

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="card-dashboard p-6">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <div className="h-4 w-24 bg-secondary-200 rounded mb-2"></div>
                                <div className="h-8 w-20 bg-secondary-300 rounded mb-2"></div>
                                <div className="h-3 w-32 bg-secondary-100 rounded"></div>
                            </div>
                            <div className="h-12 w-12 bg-secondary-200 rounded-lg"></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts & Leaderboard Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart Skeleton */}
                <div className="lg:col-span-2 card-dashboard p-6">
                    <div className="h-6 w-32 bg-secondary-200 rounded mb-4"></div>
                    <div className="h-64 bg-secondary-100 rounded"></div>
                </div>

                {/* Leaderboard Skeleton */}
                <div className="card-dashboard p-6">
                    <div className="h-6 w-32 bg-secondary-200 rounded mb-4"></div>
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-3">
                                <div className="w-8 h-8 rounded-full bg-secondary-200"></div>
                                <div className="flex-1">
                                    <div className="h-4 w-32 bg-secondary-200 rounded mb-1"></div>
                                    <div className="h-3 w-24 bg-secondary-100 rounded"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
