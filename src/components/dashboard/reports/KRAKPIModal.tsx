'use client';

import { useState } from 'react';
import { X, Target, Award } from 'lucide-react';

interface KRAKPIModalProps {
    isOpen: boolean;
    onClose: () => void;
    employeeName: string;
    kras: any[]; // Using any for flexibility or define a specific type
}

export default function KRAKPIModal({ isOpen, onClose, employeeName, kras }: KRAKPIModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="font-bold text-lg text-gray-900">KRA & KPI Details</h3>
                        <p className="text-sm text-gray-500">for {employeeName}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {kras && kras.length > 0 ? (
                        <div className="space-y-6">
                            {kras.map((kra, index) => (
                                <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                            <Target size={18} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">{kra.title || 'Untitled KRA'}</h4>
                                            <p className="text-sm text-gray-600 mt-1">{kra.description}</p>
                                        </div>
                                        {kra.weightage && (
                                            <span className="ml-auto text-xs font-bold bg-white px-2 py-1 rounded-full border border-gray-200">
                                                Weight: {kra.weightage}%
                                            </span>
                                        )}
                                    </div>

                                    {kra.kpis && kra.kpis.length > 0 && (
                                        <div className="pl-11 space-y-2">
                                            <h5 className="text-xs font-bold uppercase text-gray-500 mb-2">Key Performance Indicators</h5>
                                            {kra.kpis.map((kpi: any, kIdx: number) => (
                                                <div key={kIdx} className="flex items-center gap-2 text-sm text-gray-700 bg-white p-2 rounded-lg border border-gray-100">
                                                    <Award size={14} className="text-orange-500" />
                                                    <span className="flex-1">{kpi.title || kpi.metric}</span>
                                                    <span className="text-xs font-mono text-gray-500">{kpi.targetValue} {kpi.unit}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <Target size={48} className="mx-auto mb-4 opacity-20" />
                            <p>No KRA/KPI data found for this record.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
