'use client';

import { useState, useEffect } from 'react';
import { CHECKLIST_CATEGORIES, ChecklistCategory as ChecklistCategoryType } from '@/config/checklistItems';
import { calculatePredictions, PredictionResult } from '@/lib/predictions';
import PredictionScore from './PredictionScore';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ConversationChecklistProps {
    checkedItems: string[];
    onChange: (items: string[]) => void;
    showPredictions?: boolean;
    customerId?: string;
}

export default function ConversationChecklist({
    checkedItems,
    onChange,
    showPredictions = true,
    customerId
}: ConversationChecklistProps) {
    const [predictions, setPredictions] = useState<PredictionResult | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
        new Set(CHECKLIST_CATEGORIES.map(c => c.id))
    );

    // Calculate predictions whenever checked items change
    useEffect(() => {
        if (checkedItems.length > 0) {
            const result = calculatePredictions(checkedItems);
            setPredictions(result);
        } else {
            setPredictions(null);
        }
    }, [checkedItems]);

    const handleToggleItem = (itemId: string) => {
        if (checkedItems.includes(itemId)) {
            onChange(checkedItems.filter(id => id !== itemId));
        } else {
            onChange([...checkedItems, itemId]);
        }
    };

    const toggleCategory = (categoryId: string) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(categoryId)) {
            newExpanded.delete(categoryId);
        } else {
            newExpanded.add(categoryId);
        }
        setExpandedCategories(newExpanded);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">📋</span>
                    <h4 className="text-sm font-bold text-gray-900">Conversation Checklist</h4>
                    <span className="text-xs text-red-500">*</span>
                </div>
                {checkedItems.length > 0 && (
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {checkedItems.length} {checkedItems.length === 1 ? 'item' : 'items'} checked
                    </span>
                )}
            </div>

            {/* Real-time Predictions */}
            {showPredictions && predictions && (
                <div className="p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl border border-indigo-100 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🎯</span>
                        <h5 className="text-sm font-black text-gray-900">AI Predictions</h5>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <PredictionScore
                            label="Renewal"
                            score={predictions.renewalLikelihood}
                            icon="🎯"
                        />
                        <PredictionScore
                            label="Upsell"
                            score={predictions.upsellPotential}
                            icon="📈"
                        />
                        <PredictionScore
                            label="Churn Risk"
                            score={predictions.churnRisk}
                            icon="⚠️"
                            inverse={true}
                        />
                    </div>

                    {/* Insights */}
                    {predictions.insights.length > 0 && (
                        <div className="pt-3 border-t border-indigo-200">
                            <div className="flex items-center gap-1 mb-2">
                                <span className="text-sm">💡</span>
                                <span className="text-xs font-bold text-gray-700">Insights</span>
                            </div>
                            <ul className="space-y-1">
                                {predictions.insights.map((insight, idx) => (
                                    <li key={idx} className="text-xs text-gray-700 flex items-start gap-2">
                                        <span className="text-indigo-500 mt-0.5">•</span>
                                        <span>{insight}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Recommended Actions */}
                    {predictions.recommendedActions.length > 0 && (
                        <div className="pt-3 border-t border-indigo-200">
                            <div className="flex items-center gap-1 mb-2">
                                <span className="text-sm">✅</span>
                                <span className="text-xs font-bold text-gray-700">Recommended Actions</span>
                            </div>
                            <ul className="space-y-1">
                                {predictions.recommendedActions.map((action, idx) => (
                                    <li key={idx} className="text-xs text-gray-700 flex items-start gap-2">
                                        <span className="text-green-500 mt-0.5">→</span>
                                        <span className="font-medium">{action}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Checklist Categories */}
            <div className="space-y-3">
                {CHECKLIST_CATEGORIES.map((category) => {
                    const isExpanded = expandedCategories.has(category.id);
                    const checkedInCategory = category.items.filter(item =>
                        checkedItems.includes(item.id)
                    ).length;

                    return (
                        <div key={category.id} className="border border-gray-200 rounded-xl overflow-hidden">
                            {/* Category Header */}
                            <button
                                type="button"
                                onClick={() => toggleCategory(category.id)}
                                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">{category.icon}</span>
                                    <div className="text-left">
                                        <h5 className="text-sm font-bold text-gray-900">{category.title}</h5>
                                        <p className="text-xs text-gray-500">{category.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {checkedInCategory > 0 && (
                                        <span className="text-xs font-bold text-primary-600 bg-primary-100 px-2 py-1 rounded-full">
                                            {checkedInCategory}
                                        </span>
                                    )}
                                    {isExpanded ? (
                                        <ChevronUp size={18} className="text-gray-400" />
                                    ) : (
                                        <ChevronDown size={18} className="text-gray-400" />
                                    )}
                                </div>
                            </button>

                            {/* Category Items */}
                            {isExpanded && (
                                <div className="p-4 space-y-2 bg-white">
                                    {category.items.map((item) => {
                                        const isChecked = checkedItems.includes(item.id);

                                        return (
                                            <label
                                                key={item.id}
                                                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${isChecked
                                                        ? 'bg-primary-50 border-primary-300 shadow-sm'
                                                        : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => handleToggleItem(item.id)}
                                                    className="mt-0.5 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                                                />
                                                <div className="flex-1">
                                                    <span className={`text-sm font-medium ${isChecked ? 'text-primary-900' : 'text-gray-700'
                                                        }`}>
                                                        {item.label}
                                                    </span>
                                                    {item.weight !== 0 && (
                                                        <span className={`ml-2 text-xs font-bold ${item.weight > 0 ? 'text-green-600' : 'text-red-600'
                                                            }`}>
                                                            {item.weight > 0 ? '+' : ''}{item.weight}
                                                        </span>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Validation Message */}
            {checkedItems.length === 0 && (
                <p className="text-xs text-orange-600 flex items-center gap-1">
                    <span>⚠️</span>
                    <span>Please check at least one item to continue</span>
                </p>
            )}
        </div>
    );
}
