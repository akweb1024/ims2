/**
 * Form Skeleton Loader
 * Displays a skeleton for form layouts while content is loading
 */

interface FormSkeletonProps {
    fields?: number;
    columns?: 1 | 2;
}

export default function FormSkeleton({
    fields = 6,
    columns = 2,
}: FormSkeletonProps) {
    return (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 animate-pulse">
            {/* Form Title */}
            <div className="mb-8">
                <div className="h-8 bg-gray-300 rounded w-1/3 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>

            {/* Form Fields */}
            <div className={`grid grid-cols-1 ${columns === 2 ? 'md:grid-cols-2' : ''} gap-6`}>
                {Array.from({ length: fields }).map((_, index) => (
                    <div
                        key={`field-${index}`}
                        className="space-y-2"
                        style={{
                            animationDelay: `${index * 50}ms`,
                        }}
                    >
                        {/* Label */}
                        <div className="h-4 bg-gray-200 rounded w-1/3" />

                        {/* Input */}
                        <div className="h-12 bg-gray-100 rounded-xl border-2 border-gray-200" />
                    </div>
                ))}
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex justify-end gap-4">
                <div className="h-12 bg-gray-200 rounded-xl w-24" />
                <div className="h-12 bg-gray-300 rounded-xl w-32" />
            </div>
        </div>
    );
}
