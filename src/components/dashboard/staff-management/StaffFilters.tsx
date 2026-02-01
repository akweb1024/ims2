'use client';

import { useState, useEffect } from 'react';

interface StaffFiltersProps {
    filters: {
        companyId: string;
        teamId: string;
        employeeId: string;
        dateRange: {
            start: string;
            end: string;
        };
        status: string;
    };
    setFilters: (filters: any) => void;
}

export default function StaffFilters({ filters, setFilters }: StaffFiltersProps) {
    const [companies, setCompanies] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch companies
    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const res = await fetch('/api/companies');
                if (res.ok) {
                    const data = await res.json();
                    // Ensure data is an array
                    if (Array.isArray(data)) {
                        setCompanies(data);
                    } else if (data && Array.isArray(data.companies)) {
                        // Handle case where API returns { companies: [...] }
                        setCompanies(data.companies);
                    } else {
                        console.warn('Companies API returned unexpected format:', data);
                        setCompanies([]);
                    }
                } else {
                    console.error('Failed to fetch companies:', res.status);
                    setCompanies([]);
                }
            } catch (err) {
                console.error('Error fetching companies:', err);
                setCompanies([]);
            }
        };
        fetchCompanies();
    }, []);

    // Fetch teams based on company
    useEffect(() => {
        const fetchTeams = async () => {
            if (filters.companyId === 'all') {
                setTeams([]);
                return;
            }
            try {
                const res = await fetch(`/api/departments?companyId=${filters.companyId}`);
                if (res.ok) {
                    const data = await res.json();
                    // Ensure data is an array
                    if (Array.isArray(data)) {
                        setTeams(data);
                    } else if (data && Array.isArray(data.departments)) {
                        setTeams(data.departments);
                    } else {
                        setTeams([]);
                    }
                } else {
                    setTeams([]);
                }
            } catch (err) {
                console.error('Error fetching teams:', err);
                setTeams([]);
            }
        };
        fetchTeams();
    }, [filters.companyId]);

    // Fetch employees based on company and team
    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                let url = '/api/hr/employees';
                const params = new URLSearchParams();
                if (filters.companyId !== 'all') params.append('companyId', filters.companyId);
                if (filters.teamId !== 'all') params.append('departmentId', filters.teamId);

                if (params.toString()) {
                    url += `?${params.toString()}`;
                }

                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    // Ensure data is an array
                    if (Array.isArray(data)) {
                        setEmployees(data);
                    } else if (data && Array.isArray(data.employees)) {
                        setEmployees(data.employees);
                    } else {
                        setEmployees([]);
                    }
                } else {
                    setEmployees([]);
                }
            } catch (err) {
                console.error('Error fetching employees:', err);
                setEmployees([]);
            } finally {
                setLoading(false);
            }
        };
        fetchEmployees();
    }, [filters.companyId, filters.teamId]);

    const handleFilterChange = (key: string, value: any) => {
        setFilters((prev: any) => ({
            ...prev,
            [key]: value
        }));
    };

    const handleDateChange = (key: string, value: string) => {
        setFilters((prev: any) => ({
            ...prev,
            dateRange: {
                ...prev.dateRange,
                [key]: value
            }
        }));
    };

    const handleReset = () => {
        setFilters({
            companyId: 'all',
            teamId: 'all',
            employeeId: 'all',
            dateRange: {
                start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
            },
            status: 'all'
        });
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-4">
            <div className="flex flex-wrap gap-4 items-end">
                {/* Company Filter */}
                <div className="w-full sm:w-auto">
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Company</label>
                    <select
                        value={filters.companyId}
                        onChange={(e) => handleFilterChange('companyId', e.target.value)}
                        className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="all">All Companies</option>
                        {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                                {company.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Team Filter */}
                <div className="w-full sm:w-auto">
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Team / Department</label>
                    <select
                        value={filters.teamId}
                        onChange={(e) => handleFilterChange('teamId', e.target.value)}
                        className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        disabled={filters.companyId === 'all'}
                    >
                        <option value="all">All Teams</option>
                        {teams.map((team) => (
                            <option key={team.id} value={team.id}>
                                {team.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Employee Filter */}
                <div className="w-full sm:w-auto">
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Employee</label>
                    <select
                        value={filters.employeeId}
                        onChange={(e) => handleFilterChange('employeeId', e.target.value)}
                        className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="all">All Employees</option>
                        {employees.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                                {employee.name} ({employee.email})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Start Date */}
                <div className="w-full sm:w-auto">
                    <label className="block text-sm font-medium text-secondary-700 mb-1">From</label>
                    <input
                        type="date"
                        value={filters.dateRange.start}
                        onChange={(e) => handleDateChange('start', e.target.value)}
                        className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>

                {/* End Date */}
                <div className="w-full sm:w-auto">
                    <label className="block text-sm font-medium text-secondary-700 mb-1">To</label>
                    <input
                        type="date"
                        value={filters.dateRange.end}
                        onChange={(e) => handleDateChange('end', e.target.value)}
                        className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>

                {/* Status Filter */}
                <div className="w-full sm:w-auto">
                    <label className="block text-sm font-medium text-secondary-700 mb-1">Status</label>
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="w-full rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="all">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                        <option value="ON_LEAVE">On Leave</option>
                        <option value="TERMINATED">Terminated</option>
                    </select>
                </div>

                {/* Reset Button */}
                <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-lg text-sm font-medium hover:bg-secondary-200 transition-colors"
                >
                    Reset Filters
                </button>
            </div>
        </div>
    );
}
