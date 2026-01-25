'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface IndexingReadinessAuditProps {
    journalId: string;
    indexingId: string; // The ID of the indexing application record
    auditType: 'WOS' | 'SCOPUS';
    journalDetails: any; // Passed to check for missing fields
    initialData?: any; // The saved JSON audit data
    initialScore?: number;
    onUpdate?: () => void;
}

const WOS_CRITERIA = {
    "Journal Info": [
        "ISSN registered and verifiable",
        "Journal Title consistent on all platforms",
        "Publisher contact details visible",
        "URL is unique and accessible"
    ],
    "Scholarly Content": [
        "Scholarly content is primary (Research articles)",
        "Titles and Abstracts in English",
        "Bibliographic info in Roman script",
        "Clarity of language (Standard English)",
        "Timeliness (Last 3 issues on time)",
        "Website functionality (DOIs resolve)"
    ],
    "Editorial Quality": [
        "Editorial Board members identified",
        "Board members have affiliations listed",
        "Board diversity (Global representation)",
        "Peer Review process described",
        "Contact details for Editorial Office"
    ],
    "Ethics & Transparency": [
        "Publication Ethics statement present",
        "Copyright & Licensing info clear",
        "Author Instructions available",
        "Peer Review policy stated (Blind/Double-blind)"
    ]
};

const SCOPUS_CRITERIA = {
    "Content Policy": [
        "Convincing editorial concept/policy",
        "Peer-review type clearly stated",
        "Diversity in geographical distribution of authors",
        "Diversity in geographical distribution of editors"
    ],
    "Content Quality": [
        "Academic contribution to the field",
        "Abstracts in English",
        "Quality of language",
        "Regularity of publication schedule"
    ],
    "Journal Standing": [
        "Citedness of journal articles in Scopus",
        "Editor standing",
        "Author standing"
    ],
    "Online Availability": [
        "Online availability",
        "English language journal homepage",
        "Quality of homepage"
    ]
};

export default function IndexingReadinessAudit({
    journalId,
    indexingId,
    auditType,
    journalDetails,
    initialData = {},
    initialScore = 0,
    onUpdate
}: IndexingReadinessAuditProps) {
    const [auditData, setAuditData] = useState<Record<string, boolean>>(initialData);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const criteria = auditType === 'WOS' ? WOS_CRITERIA : SCOPUS_CRITERIA;
    const totalCriteria = Object.values(criteria).reduce((acc, list) => acc + list.length, 0);
    const activeCount = Object.values(auditData).filter(Boolean).length;
    const score = Math.round((activeCount / totalCriteria) * 100);

    // Automated "Missing Points" Checks
    const missingPoints: string[] = [];
    if (!journalDetails.issnPrint && !journalDetails.issnOnline) missingPoints.push("ISSN (Print or Online)");
    if (!journalDetails.frequency) missingPoints.push("Publication Frequency");
    if (!journalDetails.subjectCategory) missingPoints.push("Subject Category");
    if (!journalDetails.abbreviation) missingPoints.push("Journal Abbreviation");
    // Add more logical checks as per schema availability
    // e.g., if we had a dedicated 'url' field, we'd check it.

    const handleToggle = (item: string) => {
        setAuditData(prev => ({
            ...prev,
            [item]: !prev[item]
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/journals/${journalId}/indexing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    indexingId,
                    auditData,
                    auditScore: score,
                    status: score === 100 && missingPoints.length === 0 ? 'READY_TO_SUBMIT' : 'PLANNED'
                })
            });

            if (res.ok) {
                if (onUpdate) onUpdate();
                router.refresh();
                alert('Audit saved successfully!');
            } else {
                alert('Failed to save audit.');
            }
        } catch (error) {
            console.error(error);
            alert('Error saving audit.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`card-premium border-t-8 ${auditType === 'WOS' ? 'border-t-blue-600' : 'border-t-orange-500'}`}>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-900">{auditType === 'WOS' ? 'Web of Science' : 'Scopus'} Readiness Audit</h3>
                    <p className="text-sm text-gray-500">Complete all {totalCriteria} criteria to enable submission.</p>
                </div>
                <div className="flex flex-col items-end">
                    <span className={`text-3xl font-black ${auditType === 'WOS' ? 'text-blue-600' : 'text-orange-600'}`}>{score}%</span>
                    <span className="text-xs font-bold text-gray-400 uppercase">Readiness Score</span>
                </div>
            </div>

            {/* Missing Points Alert */}
            {missingPoints.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-8">
                    <h4 className="flex items-center gap-2 font-bold text-red-700 mb-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Critical Data Missing
                    </h4>
                    <p className="text-sm text-red-600 mb-2">Please update the Journal Settings to include:</p>
                    <ul className="list-disc list-inside text-sm text-red-700 font-medium ml-2">
                        {missingPoints.map(point => (
                            <li key={point}>{point}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Progress Bar */}
            <div className="w-full h-3 bg-gray-100 rounded-full mb-8 overflow-hidden">
                <div
                    className={`h-full transition-all duration-500 ${score === 100 ? 'bg-green-500' :
                        score > 70 ? (auditType === 'WOS' ? 'bg-blue-500' : 'bg-orange-500') : 'bg-gray-400'
                        }`}
                    style={{ width: `${score}%` }}
                ></div>
            </div>

            <div className="space-y-8">
                {Object.entries(criteria).map(([category, items]) => (
                    <div key={category} className="border-b border-gray-100 pb-6 last:border-0">
                        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span className={`w-2 h-8 rounded-full ${auditType === 'WOS' ? 'bg-blue-600' : 'bg-orange-500'}`}></span>
                            {category}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {items.map(item => (
                                <label key={item} className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${auditData[item]
                                        ? 'bg-white border-green-200 shadow-sm'
                                        : 'bg-gray-50 border-transparent hover:border-gray-200'
                                    }`}>
                                    <div className="relative flex items-center pt-0.5">
                                        <input
                                            type="checkbox"
                                            checked={!!auditData[item]}
                                            onChange={() => handleToggle(item)}
                                            className={`w-5 h-5 rounded focus:ring-opacity-50 ${auditType === 'WOS' ? 'text-blue-600 focus:ring-blue-500' : 'text-orange-600 focus:ring-orange-500'
                                                }`}
                                        />
                                    </div>
                                    <span className={`text-sm ${auditData[item] ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                                        {item}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-100">
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="btn btn-secondary"
                >
                    {loading ? 'Saving...' : 'Save Draft Audit'}
                </button>
                <button
                    disabled={score < 100 || missingPoints.length > 0 || loading}
                    className={`btn ${score === 100 && missingPoints.length === 0 ? 'btn-primary' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                >
                    {score === 100 && missingPoints.length === 0 ? 'Proceed to Application Phase' : 'Complete Audit first'}
                </button>
            </div>
        </div>
    );
}
