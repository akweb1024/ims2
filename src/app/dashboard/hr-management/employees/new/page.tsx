'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import EmployeeForm from '@/components/dashboard/hr/EmployeeForm';
import { ArrowLeft } from 'lucide-react';

export default function NewEmployeePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [designations, setDesignations] = useState<any[]>([]);
    const [managers, setManagers] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [userRole, setUserRole] = useState('MANAGER');

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUserRole(JSON.parse(userData).role);
        }

        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                // Fetch Designations
                const desRes = await fetch('/api/hr/designations', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (desRes.ok) setDesignations(await desRes.json());

                // Fetch Potential Managers
                const managersRes = await fetch('/api/hr/employees?all=true', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (managersRes.ok) {
                    const allEmps = await managersRes.json();
                    setManagers(allEmps.filter((e: any) =>
                        ['MANAGER', 'TEAM_LEADER', 'ADMIN', 'SUPER_ADMIN', 'JOURNAL_MANAGER', 'EDITOR_IN_CHIEF'].includes(e.user.role)
                    ));
                }

                // Fetch Companies
                const compRes = await fetch('/api/companies?limit=100', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (compRes.ok) {
                    const resData = await compRes.json();
                    setCompanies(resData.data || []);
                }

                // Fetch Departments
                const deptRes = await fetch('/api/departments', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (deptRes.ok) {
                    const resData = await deptRes.json();
                    setDepartments(resData.data || resData || []);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleSubmit = async (formData: any) => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');

            // Clean and prepare payload
            const cleanData = { ...formData };

            // Convert numbers
            const numFields = ['baseSalary', 'manualLeaveAdjustment', 'totalExperienceYears', 'totalExperienceMonths', 'relevantExperienceYears', 'relevantExperienceMonths'];
            numFields.forEach(f => {
                if (cleanData[f]) cleanData[f] = parseFloat(cleanData[f]) || 0;
            });

            // Convert empty to null for optional fields
            Object.keys(cleanData).forEach(key => {
                if (cleanData[key] === '' || cleanData[key] === undefined) {
                    cleanData[key] = null;
                }
            });

            // Re-ensure required for create
            if (!cleanData.email || !cleanData.password) {
                alert('Email and Password are required for onboarding');
                setSaving(false);
                return;
            }

            // Handle targets -> metrics
            if (cleanData.targets) {
                cleanData.metrics = { targets: cleanData.targets };
                delete cleanData.targets;
            }

            // The KRA template is assigned via /api/kra/assign after creation,
            // not stored on the profile — keep it out of the create payload.
            const kraTemplateId = cleanData.kraTemplateId || null;
            delete cleanData.kraTemplateId;

            const res = await fetch('/api/hr/employees', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(cleanData)
            });

            if (res.ok) {
                const result = await res.json();
                // Assign the chosen KRA template's goals to the new employee.
                // Non-fatal: the employee is already created; a failure here just
                // means KRA can be assigned later from the Assign KRA screen.
                if (kraTemplateId && result?.profile?.id) {
                    try {
                        await fetch('/api/kra/assign', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ templateId: kraTemplateId, periodType: 'MONTHLY', employeeIds: [result.profile.id] }),
                        });
                    } catch { /* assignment is best-effort at onboarding time */ }
                }
                alert('Employee onboarded successfully!');
                router.push(`/dashboard/hr-management/employees/${result.profile.id}`);
            } else {
                const err = await res.json();
                alert(`Failed: ${err.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error(err);
            alert('Network error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center animate-pulse">Initializing Onboarding System...</div>;

    return (
        <>
            <div className="max-w-5xl mx-auto space-y-6 pb-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-secondary-100 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6 text-secondary-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900 tracking-tight">New Onboarding</h1>
                        <p className="text-secondary-500 font-medium">Create a new staff account and profile</p>
                    </div>
                    <button
                        onClick={() => router.push('/dashboard/hr-management/employees/workflow')}
                        className="ml-auto btn btn-secondary text-xs"
                    >
                        Open Step Workflow
                    </button>
                </div>

                <EmployeeForm
                    mode="create"
                    designations={designations}
                    managers={managers}
                    companies={companies}
                    departments={departments}
                    onSubmit={handleSubmit}
                    onCancel={() => router.back()}
                    saving={saving}
                />
            </div>
        </>
    );
}

// Style guide accessibility compliance helper comment: aria-label placeholder label
