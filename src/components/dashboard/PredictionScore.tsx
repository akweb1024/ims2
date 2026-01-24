'use client';

import { getScoreColor, getScoreBgColor } from '@/lib/predictions';

interface PredictionScoreProps {
    label: string;
    score: number;
    icon: string;
    inverse?: boolean; // If true, lower scores are better (e.g., churn risk)
}

export default function PredictionScore({ label, score, icon, inverse = false }: PredictionScoreProps) {
    const colorClass = getScoreColor(score, inverse);
    const bgColorClass = getScoreBgColor(score, inverse);

    // Calculate progress bar width
    const progressWidth = `${score}%`;

    return (
        <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-lg">{icon}</span>
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">{label}</span>
                </div>
                <span className={`text-lg font-black ${colorClass}`}>
                    {score.toFixed(1)}%
                </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className={`h-full ${bgColorClass} transition-all duration-500 ease-out rounded-full`}
                    style={{ width: progressWidth }}
                />
            </div>

            {/* Score interpretation */}
            <div className="mt-1 text-[10px] text-gray-500 font-medium">
                {inverse ? (
                    score < 20 ? 'Excellent' : score < 40 ? 'Good' : score < 60 ? 'Moderate' : 'High Risk'
                ) : (
                    score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Low'
                )}
            </div>
        </div>
    );
}
