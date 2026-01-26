import { Card, CardHeader, CardContent } from "@/components/ui/Card";

export default function DashboardSkeleton() {
    return (
        <div className="space-y-8 animate-pulse">
            <div className="flex items-center justify-between">
                <div>
                    <div className="h-8 w-64 bg-secondary-200 rounded mb-2"></div>
                    <div className="h-4 w-96 bg-secondary-100 rounded"></div>
                </div>
            </div>

            {/* Metrics Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="h-4 w-24 bg-secondary-200 rounded"></div>
                            <div className="h-6 w-6 bg-secondary-200 rounded-full"></div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 w-16 bg-secondary-300 rounded mb-2"></div>
                            <div className="h-3 w-32 bg-secondary-100 rounded"></div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart Skeleton */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="h-6 w-32 bg-secondary-200 rounded"></div>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-end justify-between px-4 pb-4 gap-2">
                        {[...Array(7)].map((_, i) => (
                            <div key={i} className="w-full bg-secondary-100 rounded-t" style={{ height: `${Math.random() * 80 + 20}%` }}></div>
                        ))}
                    </CardContent>
                </Card>

                {/* Activity Skeleton */}
                <Card>
                    <CardHeader>
                        <div className="h-6 w-32 bg-secondary-200 rounded"></div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex flex-col space-y-2 border-b border-secondary-50 pb-3 last:border-0">
                                    <div className="flex justify-between">
                                        <div className="h-4 w-32 bg-secondary-200 rounded"></div>
                                        <div className="h-3 w-12 bg-secondary-100 rounded"></div>
                                    </div>
                                    <div className="h-3 w-full bg-secondary-100 rounded"></div>
                                    <div className="flex justify-between pt-1">
                                        <div className="h-2 w-20 bg-secondary-100 rounded"></div>
                                        <div className="h-2 w-16 bg-secondary-100 rounded"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
