'use client';

import Link from 'next/link';
import { BarChart3, ChevronRight, Landmark, Users } from 'lucide-react';
import type { DepartmentSummary } from './MDControlCenter';

interface DepartmentListProps {
    departments: DepartmentSummary[];
    loading: boolean;
    companyName?: string;
    onSelect: (departmentId: string) => void;
    onSelectAll: () => void;
}

export default function DepartmentList({ departments, loading, companyName, onSelect, onSelectAll }: DepartmentListProps) {
    if (loading) {
        return <div className="p-12 text-center text-secondary-400">Loading departments...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-bold text-secondary-900">
                    Departments{companyName ? ` — ${companyName}` : ''}
                </h2>
                <button onClick={onSelectAll} className="btn btn-secondary text-sm flex items-center gap-2">
                    <Users size={14} /> View all employees
                </button>
            </div>

            {!departments.length ? (
                <div className="p-12 text-center text-secondary-400">
                    No departments in this company yet. Use &quot;View all employees&quot; to browse its staff.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {departments.map((dept) => (
                        <div
                            key={dept.id}
                            className="card-premium p-5 hover:border-primary-300 transition-all group cursor-pointer"
                            onClick={() => onSelect(dept.id)}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-secondary-50 flex items-center justify-center shrink-0">
                                        <Landmark className="text-secondary-500" size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-secondary-900 truncate group-hover:text-primary-700">
                                            {dept.name}
                                            {dept.code && <span className="ml-2 text-[10px] font-mono text-secondary-400">{dept.code}</span>}
                                        </h3>
                                        <p className="text-xs text-secondary-500 mt-0.5 truncate">
                                            {dept.headUser ? `Head: ${dept.headUser.name || dept.headUser.email}` : 'No head assigned'}
                                            {dept.parentDepartment && ` • under ${dept.parentDepartment.name}`}
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight className="text-secondary-300 group-hover:text-primary-500 shrink-0" size={18} />
                            </div>
                            <div className="flex items-center gap-4 mt-4 text-xs text-secondary-500">
                                <span className="flex items-center gap-1"><Users size={13} /> {dept._count?.users ?? 0} members</span>
                                {(dept._count?.subDepartments ?? 0) > 0 && (
                                    <span>{dept._count!.subDepartments} sub-departments</span>
                                )}
                                <Link
                                    href={`/dashboard/performance/team?departmentId=${dept.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="ml-auto flex items-center gap-1 text-primary-600 hover:text-primary-700 font-bold"
                                >
                                    <BarChart3 size={13} /> KRA analytics
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
