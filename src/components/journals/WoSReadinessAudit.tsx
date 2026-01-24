'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface WoSReadinessAuditProps {
    journalId: string;
    indexingId: string; // The ID of the WoS indexing type
    initialData?: any; // The saved JSON audit data
    initialScore?: number;
    onUpdate?: () => void;
}

const AUDIT_CRITERIA = {
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

export default function WoSReadinessAudit({
    journalId,
    indexingId,
    initialData = {},
    initialScore = 0,
    onUpdate
}: WoSReadinessAuditProps) {
    const [auditData, setAuditData] = useState<Record<string, boolean>>(initialData);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const totalCriteria = Object.values(AUDIT_CRITERIA).reduce((acc, list) => acc + list.length, 0);
    const activeCount = Object.values(auditData).filter(Boolean).length;
    const score = Math.round((activeCount / totalCriteria) * 100);

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
                    status: score === 100 ? 'READY_TO_SUBMIT' : 'PLANNED'
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
        <div className="card-premium">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold text-gray-900">Web of Science Readiness Audit</h3>
                    <p className="text-sm text-gray-500">Complete all {totalCriteria} criteria to enable submission.</p>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-3xl font-black text-blue-600">{score}%</span>
                    <span className="text-xs font-bold text-gray-400 uppercase">Readiness Score</span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-gray-100 rounded-full mb-8 overflow-hidden">
                <div
                    className={`h-full transition-all duration-500 ${score === 100 ? 'bg-green-500' :
                        score > 70 ? 'bg-blue-500' : 'bg-orange-500'
                        }`}
                    style={{ width: `${score}%` }}
                ></div>
            </div>

            <div className="space-y-8">
                {Object.entries(AUDIT_CRITERIA).map(([category, items]) => (
                    <div key={category} className="border-b border-gray-100 pb-6 last:border-0">
                        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
                            {category}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {items.map(item => (
                                <label key={item} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-white border border-transparent hover:border-blue-100 transition-all cursor-pointer">
                                    <div className="relative flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={!!auditData[item]}
                                            onChange={() => handleToggle(item)}
                                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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
                    disabled={score < 100 || loading}
                    className={`btn ${score === 100 ? 'btn-primary' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                >
                    {score === 100 ? 'Proceed to Application Phase' : 'Complete Audit first'}
                </button>
            </div>

            {score < 100 && (
                <p className="text-center text-xs text-orange-500 mt-4 font-bold">
                    ⚠️ Review all 24 criteria carefully. &quot;Foolproof&quot; accuracy requires 100% compliance.
                </p>
            )}
        </div>
    );
}
