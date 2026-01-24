'use client';

import { AgencyDetails, AgencyPerformance } from '@prisma/client';
import Link from 'next/link';

interface AgencyPerformanceDashboardProps {
    details: AgencyDetails & { performance: AgencyPerformance | null };
}

export default function AgencyPerformanceDashboard({ details }: AgencyPerformanceDashboardProps) {
    const perf = details.performance;

    if (!perf) {
        return (
            <div className="card-premium p-8 text-center bg-gray-50 border-dashed border-2 border-gray-200">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">No Performance Data Yet</h3>
                <p className="text-gray-500 mb-6">Initialize evaluation to see metrics.</p>
                <button
                    disabled // Implementation in next phase
                    className="btn btn-primary"
                >
                    Initialize Evaluation
                </button>
            </div>
        );
    }

    const getScoreColor = (score: number, max: number = 100) => {
        const percentage = (score / max) * 100;
        if (percentage >= 80) return 'text-green-600';
        if (percentage >= 50) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className="space-y-6">
            {/* 1. Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card-premium flex flex-col items-center justify-center p-6 text-center">
                    <span className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-2">Agency Rating</span>
                    <div className="flex items-center gap-1">
                        <span className="text-4xl font-black text-yellow-500">{perf.rating.toFixed(1)}</span>
                        <span className="text-lg text-gray-400">/ 5</span>
                    </div>
                    <div className="flex text-yellow-400 mt-2">
                        {[1, 2, 3, 4, 5].map(star => (
                            <span key={star}>{star <= perf.rating ? '★' : '☆'}</span>
                        ))}
                    </div>
                </div>

                <div className="card-premium flex flex-col items-center justify-center p-6 text-center">
                    <span className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-2">Performance Category</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${perf.category === 'HIGH_PERFORMING' ? 'bg-green-100 text-green-800 border-green-200' :
                            perf.category === 'MODERATE' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                'bg-red-100 text-red-800 border-red-200'
                        }`}>
                        {perf.category.replace('_', ' ')}
                    </span>
                </div>

                <div className="card-premium flex flex-col items-center justify-center p-6 text-center">
                    <span className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-2">Strategic Fit</span>
                    <div className="relative w-24 h-24 flex items-center justify-center">
                        {/* Simple Circular Progress Placeholder */}
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="48" cy="48" r="40" stroke="#eee" strokeWidth="8" fill="none" />
                            <circle cx="48" cy="48" r="40" stroke={perf.strategicFitScore >= 7 ? '#10B981' : '#F59E0B'} strokeWidth="8" fill="none"
                                strokeDasharray={251.2}
                                strokeDashoffset={251.2 - (251.2 * perf.strategicFitScore) / 10}
                            />
                        </svg>
                        <span className="absolute text-2xl font-black text-gray-800">{perf.strategicFitScore}</span>
                    </div>
                </div>

                <div className="card-premium flex flex-col items-center justify-center p-6 text-center">
                    <span className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-2">Management View</span>
                    <span className={`text-xl font-black ${perf.managementRecommendation === 'INVEST' ? 'text-green-600' :
                            perf.managementRecommendation === 'EXIT' ? 'text-red-600' : 'text-blue-600'
                        }`}>
                        {perf.managementRecommendation}
                    </span>
                </div>
            </div>

            {/* 2. Detailed Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Business Performance */}
                <div className="card-premium">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-xl">💰</span> Business Performance
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-600">Business Last Year</span>
                            <span className="font-bold text-gray-900">₹{perf.businessLastYear.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-600">Current Year Target</span>
                            <span className="font-bold text-blue-600">₹{perf.targetCurrentYear.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-600">Avg. Orders / Month</span>
                            <span className="font-bold text-gray-900">{perf.avgOrdersPerMonth}</span>
                        </div>
                    </div>
                </div>

                {/* Profile & Compliance */}
                <div className="card-premium">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-xl">🛡️</span> Compliance & Risk
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Agreement Signed</span>
                            <span className={details.agreementSigned ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                                {details.agreementSigned ? 'YES' : 'NO'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">GST Number</span>
                            <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded">{details.gstNumber || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Payment Disputes</span>
                            <span className={details.hasPaymentDisputes ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                                {details.hasPaymentDisputes ? 'YES' : 'NO'}
                            </span>
                        </div>
                        <div className="w-full h-px bg-gray-100 my-2"></div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Profile Completion</span>
                            <div className="flex items-center gap-2 w-1/2">
                                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: `${perf.profileCompletion}%` }}></div>
                                </div>
                                <span className="text-xs font-bold text-blue-600">{perf.profileCompletion}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Operational Info */}
            <div className="card-premium">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Operational Footprint</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">Working Regions</span>
                        <div className="flex flex-wrap gap-2">
                            {details.workingRegions.length > 0 ? details.workingRegions.map(r => (
                                <span key={r} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                                    {r}
                                </span>
                            )) : <span className="text-sm text-gray-400 italic">No regions specified</span>}
                        </div>
                    </div>
                    <div>
                        <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block mb-2">Institution Types</span>
                        <div className="flex flex-wrap gap-2">
                            {details.institutionTypes.length > 0 ? details.institutionTypes.map(t => (
                                <span key={t} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                                    {t}
                                </span>
                            )) : <span className="text-sm text-gray-400 italic">No types specified</span>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
