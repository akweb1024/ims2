interface VerificationBadgeProps {
    status: string;
}

export default function VerificationBadge({ status }: VerificationBadgeProps) {
    const getStyles = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'VERIFIED':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'UNVERIFIED':
                return 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse';
            case 'NEEDS_PROOF':
                return 'bg-red-50 text-red-700 border-red-200';
            case 'DISPUTED':
                return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'PENDING':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            default:
                return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    const getIcon = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'VERIFIED': return '✓';
            case 'UNVERIFIED': return '⏳';
            case 'NEEDS_PROOF': return '⚠️';
            default: return '•';
        }
    };

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-sm ${getStyles(status)}`}>
            <span>{getIcon(status)}</span>
            {status?.replace('_', ' ')}
        </span>
    );
}
