import { FileText, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

async function getManuscriptsData() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/manuscripts/author`, {
        cache: 'no-store'
    });

    if (!res.ok) {
        throw new Error('Failed to fetch manuscripts');
    }

    return res.json();
}

function getStatusColor(status: string) {
    const colors: Record<string, string> = {
        'SUBMITTED': 'bg-blue-100 text-blue-700 border-blue-200',
        'UNDER_REVIEW': 'bg-purple-100 text-purple-700 border-purple-200',
        'REVISION_REQUIRED': 'bg-orange-100 text-orange-700 border-orange-200',
        'ACCEPTED': 'bg-green-100 text-green-700 border-green-200',
        'REJECTED': 'bg-red-100 text-red-700 border-red-200',
        'PUBLISHED': 'bg-emerald-100 text-emerald-700 border-emerald-200'
    };
    return colors[status] || 'bg-secondary-100 text-secondary-700 border-secondary-200';
}

function getStatusIcon(status: string) {
    switch (status) {
        case 'ACCEPTED':
        case 'PUBLISHED':
            return <CheckCircle className="w-4 h-4" />;
        case 'REJECTED':
            return <XCircle className="w-4 h-4" />;
        case 'REVISION_REQUIRED':
            return <AlertCircle className="w-4 h-4" />;
        default:
            return <Clock className="w-4 h-4" />;
    }
}

export default async function AuthorStats() {
    const manuscripts = await getManuscriptsData();

    const stats = {
        total: manuscripts.length,
        submitted: manuscripts.filter((m: any) => m.manuscriptStatus === 'SUBMITTED').length,
        underReview: manuscripts.filter((m: any) => ['UNDER_REVIEW', 'PLAGIARISM_CHECK', 'QUALITY_CHECK'].includes(m.manuscriptStatus)).length,
        revisionRequired: manuscripts.filter((m: any) => m.manuscriptStatus === 'REVISION_REQUIRED').length,
        accepted: manuscripts.filter((m: any) => m.manuscriptStatus === 'ACCEPTED').length,
        published: manuscripts.filter((m: any) => m.manuscriptStatus === 'PUBLISHED').length
    };

    return (
        <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="card-premium p-4">
                    <div className="text-3xl font-black text-secondary-900">{stats.total}</div>
                    <div className="text-xs font-bold text-secondary-500 uppercase mt-1">Total</div>
                </div>
                <div className="card-premium p-4 border-blue-100 bg-blue-50/30">
                    <div className="text-3xl font-black text-blue-600">{stats.submitted}</div>
                    <div className="text-xs font-bold text-blue-600 uppercase mt-1">Submitted</div>
                </div>
                <div className="card-premium p-4 border-purple-100 bg-purple-50/30">
                    <div className="text-3xl font-black text-purple-600">{stats.underReview}</div>
                    <div className="text-xs font-bold text-purple-600 uppercase mt-1">Under Review</div>
                </div>
                <div className="card-premium p-4 border-orange-100 bg-orange-50/30">
                    <div className="text-3xl font-black text-orange-600">{stats.revisionRequired}</div>
                    <div className="text-xs font-bold text-orange-600 uppercase mt-1">Revisions</div>
                </div>
                <div className="card-premium p-4 border-green-100 bg-green-50/30">
                    <div className="text-3xl font-black text-green-600">{stats.accepted}</div>
                    <div className="text-xs font-bold text-green-600 uppercase mt-1">Accepted</div>
                </div>
                <div className="card-premium p-4 border-emerald-100 bg-emerald-50/30">
                    <div className="text-3xl font-black text-emerald-600">{stats.published}</div>
                    <div className="text-xs font-bold text-emerald-600 uppercase mt-1">Published</div>
                </div>
            </div>

            {/* Manuscripts List */}
            <div className="card-premium overflow-hidden">
                <div className="p-4 border-b border-secondary-100">
                    <h2 className="text-lg font-bold text-secondary-900">My Manuscripts</h2>
                </div>

                {manuscripts.length === 0 ? (
                    <div className="p-8 text-center">
                        <FileText className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
                        <p className="text-secondary-600 mb-4">No manuscripts submitted yet</p>
                    </div>
                ) : (
                    <div className="divide-y divide-secondary-100">
                        {manuscripts.map((manuscript: any) => (
                            <div
                                key={manuscript.id}
                                className="p-6 hover:bg-secondary-50/50 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-bold text-secondary-900">{manuscript.title}</h3>
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wide border ${getStatusColor(manuscript.manuscriptStatus)}`}>
                                                {getStatusIcon(manuscript.manuscriptStatus)}
                                                {manuscript.manuscriptStatus.replace(/_/g, ' ')}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4 text-sm text-secondary-600">
                                            <span className="font-medium">{manuscript.manuscriptId}</span>
                                            <span>•</span>
                                            <span>{manuscript.journal.name}</span>
                                            <span>•</span>
                                            <span>Submitted {new Date(manuscript.submissionDate).toLocaleDateString()}</span>
                                        </div>

                                        {manuscript.abstract && (
                                            <p className="text-sm text-secondary-600 mt-2 line-clamp-2">
                                                {manuscript.abstract}
                                            </p>
                                        )}

                                        {manuscript.authors.length > 1 && (
                                            <div className="flex items-center gap-2 mt-3">
                                                <span className="text-xs font-bold text-secondary-500">Authors:</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {manuscript.authors.slice(0, 3).map((author: any) => (
                                                        <span key={author.id} className="text-xs px-2 py-0.5 bg-secondary-100 text-secondary-700 rounded-md">
                                                            {author.name}
                                                        </span>
                                                    ))}
                                                    {manuscript.authors.length > 3 && (
                                                        <span className="text-xs text-secondary-500">
                                                            +{manuscript.authors.length - 3} more
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
