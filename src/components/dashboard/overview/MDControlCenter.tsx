'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, Globe2 } from 'lucide-react';
import GroupStatStrip from './GroupStatStrip';
import CompanyGrid from './CompanyGrid';
import DepartmentList from './DepartmentList';
import EmployeeExplorer from './EmployeeExplorer';
import EmployeePanel from './EmployeePanel';

export interface CompanySummary {
    id: string;
    name: string;
    domain?: string | null;
    registrationNumber?: string | null;
    _count?: { users: number; primaryUsers?: number };
}

export interface DepartmentSummary {
    id: string;
    name: string;
    code?: string | null;
    departmentType?: string;
    headUser?: { id: string; name: string | null; email: string } | null;
    parentDepartment?: { id: string; name: string } | null;
    _count?: { users: number; subDepartments: number };
}

export interface StaffRow {
    id: string; // User id
    name: string | null;
    email: string;
    status: string;
    companyName: string;
    departmentId?: string | null;
    department?: { id: string; name: string } | null;
    manager?: { id: string; name: string | null } | null;
    designation?: { title: string } | null;
    profilePicture?: string | null;
}

export default function MDControlCenter() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const companyId = searchParams.get('companyId');
    const departmentId = searchParams.get('departmentId'); // 'all' = every department
    const employeeId = searchParams.get('employeeId'); // User id

    const [companies, setCompanies] = useState<CompanySummary[]>([]);
    const [companiesLoading, setCompaniesLoading] = useState(true);
    const [departments, setDepartments] = useState<DepartmentSummary[]>([]);
    const [departmentsLoading, setDepartmentsLoading] = useState(false);
    const [staff, setStaff] = useState<StaffRow[]>([]);
    const [staffLoading, setStaffLoading] = useState(false);

    // Every drill level lives in the query string so views are shareable and
    // the browser back button walks back up the hierarchy.
    const navigate = useCallback((params: { companyId?: string | null; departmentId?: string | null; employeeId?: string | null }) => {
        const next = new URLSearchParams(searchParams.toString());
        for (const [key, value] of Object.entries(params)) {
            if (value) next.set(key, value);
            else next.delete(key);
        }
        router.push(`/dashboard/overview?${next.toString()}`);
    }, [router, searchParams]);

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/companies?limit=100');
                if (res.ok) {
                    const data = await res.json();
                    setCompanies(data.data || []);
                }
            } catch {
                // Grid shows its empty state.
            } finally {
                setCompaniesLoading(false);
            }
        })();
    }, []);

    useEffect(() => {
        if (!companyId) { setDepartments([]); return; }
        (async () => {
            setDepartmentsLoading(true);
            try {
                const res = await fetch(`/api/hr/departments?companyId=${companyId}`);
                if (res.ok) setDepartments(await res.json());
            } catch {
                // List shows its empty state.
            } finally {
                setDepartmentsLoading(false);
            }
        })();
    }, [companyId]);

    useEffect(() => {
        if (!companyId || !departmentId) { setStaff([]); return; }
        (async () => {
            setStaffLoading(true);
            try {
                const params = new URLSearchParams({ format: 'staff', companyId });
                if (departmentId !== 'all') params.set('departmentId', departmentId);
                const res = await fetch(`/api/hr/employees?${params.toString()}`);
                if (res.ok) setStaff(await res.json());
            } catch {
                // Explorer shows its empty state.
            } finally {
                setStaffLoading(false);
            }
        })();
    }, [companyId, departmentId]);

    const company = companies.find((c) => c.id === companyId);
    const department = departments.find((d) => d.id === departmentId);
    const selectedEmployee = staff.find((s) => s.id === employeeId);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-secondary-900 flex items-center gap-2">
                    <Globe2 className="text-primary-500" size={24} /> MD Control Center
                </h1>
                <p className="text-secondary-500 text-sm mt-1">
                    Drill down from the group into companies, departments, teams and individual performance.
                </p>
            </div>

            {/* Breadcrumb */}
            <nav className="flex items-center gap-1 text-sm flex-wrap">
                <button
                    onClick={() => navigate({ companyId: null, departmentId: null, employeeId: null })}
                    className={`font-bold ${!companyId ? 'text-secondary-900' : 'text-primary-600 hover:text-primary-700'}`}
                >
                    Group
                </button>
                {company && (
                    <>
                        <ChevronRight size={14} className="text-secondary-400" />
                        <button
                            onClick={() => navigate({ departmentId: null, employeeId: null })}
                            className={`font-bold ${!departmentId ? 'text-secondary-900' : 'text-primary-600 hover:text-primary-700'}`}
                        >
                            {company.name}
                        </button>
                    </>
                )}
                {companyId && departmentId && (
                    <>
                        <ChevronRight size={14} className="text-secondary-400" />
                        <span className="font-bold text-secondary-900">
                            {departmentId === 'all' ? 'All Departments' : (department?.name || 'Department')}
                        </span>
                    </>
                )}
            </nav>

            {!companyId && (
                <>
                    <GroupStatStrip />
                    <CompanyGrid
                        companies={companies}
                        loading={companiesLoading}
                        onSelect={(id) => navigate({ companyId: id, departmentId: null, employeeId: null })}
                    />
                </>
            )}

            {companyId && !departmentId && (
                <DepartmentList
                    departments={departments}
                    loading={departmentsLoading}
                    companyName={company?.name}
                    onSelect={(id) => navigate({ departmentId: id, employeeId: null })}
                    onSelectAll={() => navigate({ departmentId: 'all', employeeId: null })}
                />
            )}

            {companyId && departmentId && (
                <EmployeeExplorer
                    staff={staff}
                    loading={staffLoading}
                    onSelect={(id) => navigate({ employeeId: id })}
                />
            )}

            {employeeId && (
                <EmployeePanel
                    userId={employeeId}
                    fallbackName={selectedEmployee?.name || selectedEmployee?.email}
                    onClose={() => navigate({ employeeId: null })}
                />
            )}
        </div>
    );
}
