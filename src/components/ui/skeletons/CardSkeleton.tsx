/**
 * Card Skeleton Loader
 * Displays a skeleton for card-based layouts (metrics, stats, etc.)
 */

interface CardSkeletonProps {
    count?: number;
    variant?: 'stat' | 'content' | 'image';
}

export default function CardSkeleton({
    count = 4,
    variant = 'stat',
}: CardSkeletonProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={`card-${index}`}
                    className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 animate-pulse"
                    style={{
                        animationDelay: `${index * 100}ms`,
                    }}
                >
                    {variant === 'stat' && (
                        <>
                            {/* Icon placeholder */}
                            <div className="w-12 h-12 bg-gray-200 rounded-lg mb-4" />

                            {/* Title */}
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />

                            {/* Value */}
                            <div className="h-8 bg-gray-300 rounded w-1/2 mb-2" />

                            {/* Subtitle */}
                            <div className="h-3 bg-gray-200 rounded w-2/3" />
                        </>
                    )}

                    {variant === 'content' && (
                        <>
                            {/* Title */}
                            <div className="h-5 bg-gray-300 rounded w-3/4 mb-4" />

                            {/* Content lines */}
                            <div className="space-y-2">
                                <div className="h-3 bg-gray-200 rounded w-full" />
                                <div className="h-3 bg-gray-200 rounded w-5/6" />
                                <div className="h-3 bg-gray-200 rounded w-4/6" />
                            </div>

                            {/* Button placeholder */}
                            <div className="h-10 bg-gray-200 rounded-lg w-full mt-4" />
                        </>
                    )}

                    {variant === 'image' && (
                        <>
                            {/* Image placeholder */}
                            <div className="w-full h-40 bg-gray-200 rounded-lg mb-4" />

                            {/* Title */}
                            <div className="h-5 bg-gray-300 rounded w-3/4 mb-2" />

                            {/* Description */}
                            <div className="h-3 bg-gray-200 rounded w-full mb-1" />
                            <div className="h-3 bg-gray-200 rounded w-2/3" />
                        </>
                    )}
                </div>
            ))}
        </div>
    );
}
