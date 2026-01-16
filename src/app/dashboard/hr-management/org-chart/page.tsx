'use client';

import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useEmployees, useDepartments } from '@/hooks/useHR';
import {
    Users, Search, ChevronRight, ChevronDown,
    User, Building2, Mail, Phone, MapPin
} from 'lucide-react';

interface EmployeeNodeProps {
    employee: any;
    depth: number;
}

const EmployeeCard = ({ employee, depth }: EmployeeNodeProps) => {
    return (
        <div
            className={`flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all relative group
                ${depth === 0 ? 'border-l-4 border-l-purple-600 bg-purple-50/10' : ''}`}
        >
            <div className={`
                w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-md shrink-0
                ${depth === 0 ? 'bg-gradient-to-br from-purple-600 to-indigo-600' :
                    depth === 1 ? 'bg-gradient-to-br from-blue-500 to-cyan-500' :
                        'bg-gradient-to-br from-gray-400 to-gray-500'}
            `}>
                {employee.user?.name?.charAt(0) || employee.employeeId?.charAt(0) || 'U'}
            </div>

            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900 truncate">{employee.user?.name || 'Unknown'}</h4>
                <p className="text-xs text-purple-600 font-bold uppercase tracking-wide mb-1">
                    {employee.designation?.title || 'Employee'}
                </p>
                <div className="flex flex-col gap-1 text-[11px] text-gray-500">
                    {employee.user?.email && (
                        <div className="flex items-center gap-1.5">
                            <Mail size={10} />
                            <span className="truncate">{employee.user.email}</span>
                        </div>
                    )}
                    {employee.department?.name && (
                        <div className="flex items-center gap-1.5">
                            <Building2 size={10} />
                            <span>{employee.department.name}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Connecting Line for tree visual */}
            {depth > 0 && (
                <div className="absolute -left-6 top-1/2 w-6 h-px bg-gray-300 hidden md:block" />
            )}
        </div>
    );
};

export default function OrgChartPage() {
    const { data: employees, isLoading: loadingEmps } = useEmployees();
    const { data: departments, isLoading: loadingDepts } = useDepartments();
    const [searchTerm, setSearchTerm] = useState('');
    const [groupBy, setGroupBy] = useState<'DEPARTMENT' | 'HIERARCHY'>('DEPARTMENT');

    // Grouping Logic
    const groupedData = useMemo(() => {
        if (!employees || !departments) return {};

        if (groupBy === 'DEPARTMENT') {
            const groups: any = {};
            departments.forEach((dept: any) => {
                groups[dept.name] = employees.filter((e: any) => e.departmentId === dept.id);
            });
            // Handle unassigned
            const unassigned = employees.filter((e: any) => !e.departmentId);
            if (unassigned.length > 0) groups['Unassigned'] = unassigned;
            return groups;
        }

        // Use Mock Hierarchy if managerId missing, otherwise build tree
        // For demonstration, we will just use Department grouping as the primary view 
        // because the 'managerId' field isn't reliably in the hook type yet.
        return {};
    }, [employees, departments, groupBy]);

    const filteredGroups = useMemo(() => {
        if (!searchTerm) return groupedData;
        const result: any = {};
        Object.keys(groupedData).forEach(key => {
            const filteredEmps = groupedData[key].filter((e: any) =>
                e.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                e.designation?.title?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            if (filteredEmps.length > 0) result[key] = filteredEmps;
        });
        return result;
    }, [groupedData, searchTerm]);

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-in fade-in duration-500 min-h-screen pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                            <span className="p-3 bg-gradient-to-br from-purple-100 to-indigo-50 rounded-2xl text-purple-600">
                                <Users size={32} />
                            </span>
                            Organization Chart
                        </h1>
                        <p className="text-gray-500 mt-2 font-medium ml-1">
                            Visual directory of departments and reporting structures.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative group flex-1 md:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5 group-focus-within:text-purple-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Find people..."
                                className="w-full bg-gray-50 border-none rounded-2xl py-3 pl-12 pr-4 font-bold text-sm focus:ring-2 focus:ring-purple-200 transition-all outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
                            <button
                                onClick={() => setGroupBy('DEPARTMENT')}
                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${groupBy === 'DEPARTMENT' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Depts
                            </button>
                            {/* Placeholder for Hierarchy switch if we implement it later */}
                            <button
                                disabled
                                className="px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest text-gray-300 cursor-not-allowed"
                            >
                                Tree
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                {(loadingEmps || loadingDepts) ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-8">
                        {Object.entries(filteredGroups).map(([deptName, deptEmployees]: [string, any]) => (
                            <div key={deptName} className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-px flex-1 bg-gray-200"></div>
                                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">{deptName}</h3>
                                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold">{(deptEmployees as any[]).length}</span>
                                    <div className="h-px flex-1 bg-gray-200"></div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {(deptEmployees as any[]).map((emp) => (
                                        <EmployeeCard key={emp.id} employee={emp} depth={1} />
                                    ))}
                                </div>
                            </div>
                        ))}

                        {Object.keys(filteredGroups).length === 0 && (
                            <div className="text-center py-20 rounded-[2rem] border-2 border-dashed border-gray-200 bg-gray-50/50">
                                <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                                <h3 className="text-lg font-bold text-gray-400">No employees found</h3>
                                <p className="text-gray-400 text-sm">Try adjusting your search.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
