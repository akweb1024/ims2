'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import EmployeeForm from '@/components/dashboard/hr/EmployeeForm';
import { ArrowLeft } from 'lucide-react';

export default function EditEmployeePage() {
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [designations, setDesignations] = useState<any[]>([]);
    const [managers, setManagers] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [empInitialData, setEmpInitialData] = useState<any>(null);
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

                // Fetch Employee
                const empRes = await fetch(`/api/hr/employees/${params.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (empRes.ok) {
                    const data = await empRes.json();
                    // Flatten data for the form
                    setEmpInitialData({
                        ...data,
                        email: data.user.email,
                        name: data.user.name || '',
                        role: data.user.role,
                        isActive: data.user.isActive,
                        managerId: data.user.managerId || '',
                        companyId: data.user.companyId || '',
                        companyIds: data.user.companies?.map((c: any) => c.id) || [],
                        departmentId: data.user.departmentId || '',
                        allowedModules: data.user.allowedModules || ['CORE'],
                        targets: data.metrics?.targets || { revenue: '', publication: '', development: '' },
                        dateOfJoining: data.dateOfJoining?.split('T')[0] || '',
                        lastPromotionDate: data.lastPromotionDate?.split('T')[0] || '',
                        lastIncrementDate: data.lastIncrementDate?.split('T')[0] || '',
                        nextReviewDate: data.nextReviewDate?.split('T')[0] || '',
                    });
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [params.id]);

    const handleSubmit = async (formData: any) => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const cleanData = { ...formData };

            // Handle password (don't send if empty)
            if (!cleanData.password) delete cleanData.password;

            // System email can't be updated via this route usually, but let API handle it if allowed. 
            // Most APIs expect 'email' for create, but ignore for update.
            delete cleanData.email;

            // Convert numbers
            const numFields = ['baseSalary', 'manualLeaveAdjustment', 'totalExperienceYears', 'totalExperienceMonths', 'relevantExperienceYears', 'relevantExperienceMonths'];
            numFields.forEach(f => {
                if (cleanData[f] !== undefined) cleanData[f] = parseFloat(cleanData[f]) || 0;
            });

            // Convert empty to null
            Object.keys(cleanData).forEach(key => {
                if (cleanData[key] === '' || cleanData[key] === 'null' || cleanData[key] === 'undefined') {
                    cleanData[key] = null;
                }
            });

            // Handle targets -> metrics
            if (cleanData.targets) {
                cleanData.metrics = { ...(empInitialData.metrics || {}), targets: cleanData.targets };
                delete cleanData.targets;
            }

            const res = await fetch('/api/hr/employees', {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: params.id, ...cleanData })
            });

            if (res.ok) {
                alert('Employee updated successfully!');
                router.push(`/dashboard/hr-management/employees/${params.id}`);
            } else {
                const err = await res.json();
                alert(`Failed to update: ${err.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error(err);
            alert('Network error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center animate-pulse">Loading Employee Data...</div>;

    return (
        <DashboardLayout userRole={userRole}>
            <div className="max-w-5xl mx-auto space-y-6 pb-20">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-secondary-100 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6 text-secondary-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900 tracking-tight">Update Employee</h1>
                        <p className="text-secondary-500 font-medium tracking-tight">Modifying <span className="text-primary-600 font-bold">{empInitialData?.user?.email}</span></p>
                    </div>
                </div>

                <EmployeeForm
                    mode="edit"
                    initialData={empInitialData}
                    designations={designations}
                    managers={managers}
                    companies={companies}
                    departments={departments}
                    onSubmit={handleSubmit}
                    onCancel={() => router.back()}
                    saving={saving}
                />
            </div>
        </DashboardLayout>
    );
}
