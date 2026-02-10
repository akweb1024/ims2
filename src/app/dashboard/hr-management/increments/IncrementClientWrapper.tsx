'use client';

import { useState } from 'react';
import { List, LayoutGrid, Plus, BarChart2 } from 'lucide-react';
import Link from 'next/link';
import IncrementList from './IncrementList';
import IncrementTracker from './IncrementTracker';
import IncrementAnalyticsTab from './IncrementAnalyticsTab';

export default function IncrementClientWrapper({ initialIncrements }: { initialIncrements: any[] }) {
    const [viewMode, setViewMode] = useState<'list' | 'tracker' | 'analytics'>('tracker');

    return (
        <div className="space-y-6">
            {/* Sub-Header with Toggle */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-secondary-100 p-1 rounded-xl flex gap-1">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold ${viewMode === 'list'
                                ? 'bg-white shadow-sm text-primary-600'
                                : 'text-secondary-500 hover:text-secondary-700'
                                }`}
                        >
                            <List size={16} /> List
                        </button>
                        <button
                            onClick={() => setViewMode('tracker')}
                            className={`p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold ${viewMode === 'tracker'
                                ? 'bg-white shadow-sm text-primary-600'
                                : 'text-secondary-500 hover:text-secondary-700'
                                }`}
                        >
                            <LayoutGrid size={16} /> Tracker
                        </button>
                        <button
                            onClick={() => setViewMode('analytics')}
                            className={`p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold ${viewMode === 'analytics'
                                ? 'bg-white shadow-sm text-primary-600'
                                : 'text-secondary-500 hover:text-secondary-700'
                                }`}
                        >
                            <BarChart2 size={16} /> Analytics
                        </button>
                    </div>
                </div>
                <Link href="/dashboard/hr-management/increments/new" className="btn btn-primary">
                    <Plus size={20} />
                    New Increment
                </Link>
            </div>

            {/* Data View */}
            {viewMode === 'list' ? (
                <IncrementList initialIncrements={initialIncrements} />
            ) : viewMode === 'tracker' ? (
                <IncrementTracker initialIncrements={initialIncrements} />
            ) : (
                <IncrementAnalyticsTab />
            )}
        </div>
    );
}
