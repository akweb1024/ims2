export default function ProductionHubSkeleton() {
    return (
        <div className="space-y-8 pb-20 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="h-10 w-64 bg-secondary-200 rounded mb-2"></div>
                    <div className="h-5 w-96 bg-secondary-100 rounded"></div>
                </div>
                <div className="h-12 w-48 bg-secondary-200 rounded-2xl"></div>
            </div>

            {/* Navigation Tabs Skeleton */}
            <div className="flex gap-2 p-1.5 bg-secondary-100 rounded-2xl w-fit">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-10 w-24 bg-secondary-200 rounded-xl"></div>
                ))}
            </div>

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="card-premium p-6">
                        <div className="h-10 w-10 bg-secondary-100 rounded-xl mb-4"></div>
                        <div className="h-8 w-20 bg-secondary-300 rounded mb-1"></div>
                        <div className="h-3 w-32 bg-secondary-100 rounded mb-3"></div>
                        <div className="h-5 w-24 bg-secondary-100 rounded"></div>
                    </div>
                ))}
            </div>

            {/* Content Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="h-6 w-48 bg-secondary-200 rounded"></div>
                        <div className="h-5 w-20 bg-secondary-100 rounded"></div>
                    </div>
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="card-premium p-6">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-secondary-100 rounded-2xl"></div>
                                    <div className="flex-1 space-y-3">
                                        <div className="h-6 w-64 bg-secondary-200 rounded"></div>
                                        <div className="h-4 w-full bg-secondary-100 rounded"></div>
                                        <div className="h-2 w-full bg-secondary-100 rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                    <div className="h-6 w-40 bg-secondary-200 rounded"></div>
                    <div className="card-premium divide-y divide-secondary-100">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="p-4 space-y-2">
                                <div className="h-5 w-full bg-secondary-200 rounded"></div>
                                <div className="h-4 w-32 bg-secondary-100 rounded"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
