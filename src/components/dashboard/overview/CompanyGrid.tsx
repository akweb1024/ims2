'use client';

import { Building2, ChevronRight, Users } from 'lucide-react';
import type { CompanySummary } from './MDControlCenter';

interface CompanyGridProps {
    companies: CompanySummary[];
    loading: boolean;
    onSelect: (companyId: string) => void;
}

export default function CompanyGrid({ companies, loading, onSelect }: CompanyGridProps) {
    if (loading) {
        return <div className="p-12 text-center text-secondary-400">Loading companies...</div>;
    }

    if (!companies.length) {
        return <div className="p-12 text-center text-secondary-400">No companies available.</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {companies.map((company) => (
                <button
                    key={company.id}
                    onClick={() => onSelect(company.id)}
                    className="card-premium p-6 text-left hover:border-primary-300 hover:shadow-md transition-all group"
                >
                    <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center">
                            <Building2 className="text-primary-600" size={22} />
                        </div>
                        <ChevronRight className="text-secondary-300 group-hover:text-primary-500 transition-colors" size={18} />
                    </div>
                    <h3 className="font-bold text-secondary-900 mt-4 group-hover:text-primary-700">{company.name}</h3>
                    {company.domain && <p className="text-xs text-secondary-400 mt-0.5">{company.domain}</p>}
                    <p className="text-sm text-secondary-500 mt-3 flex items-center gap-1.5">
                        <Users size={14} />
                        {company._count?.primaryUsers ?? company._count?.users ?? 0} staff
                    </p>
                </button>
            ))}
        </div>
    );
}
