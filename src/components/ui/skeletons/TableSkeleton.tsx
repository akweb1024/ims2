/**
 * Table Skeleton Loader
 * Displays a skeleton for data tables while content is loading
 */

interface TableSkeletonProps {
    rows?: number;
    columns?: number;
    showHeader?: boolean;
}

export default function TableSkeleton({
    rows = 5,
    columns = 5,
    showHeader = true,
}: TableSkeletonProps) {
    return (
        <div className="w-full animate-pulse">
            {/* Table Header */}
            {showHeader && (
                <div className="bg-gray-100 rounded-t-xl p-4 flex gap-4 border-b border-gray-200">
                    {Array.from({ length: columns }).map((_, i) => (
                        <div
                            key={`header-${i}`}
                            className="h-4 bg-gray-300 rounded flex-1"
                            style={{
                                animationDelay: `${i * 50}ms`,
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Table Rows */}
            <div className="bg-white rounded-b-xl divide-y divide-gray-200">
                {Array.from({ length: rows }).map((_, rowIndex) => (
                    <div key={`row-${rowIndex}`} className="p-4 flex gap-4">
                        {Array.from({ length: columns }).map((_, colIndex) => (
                            <div
                                key={`cell-${rowIndex}-${colIndex}`}
                                className="h-4 bg-gray-200 rounded flex-1"
                                style={{
                                    animationDelay: `${(rowIndex * columns + colIndex) * 30}ms`,
                                }}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
