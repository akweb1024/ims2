'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Users, Building, X } from 'lucide-react';

interface StaffFiltersProps {
    filters: {
        search: string;
        searchType?: string;
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
    const [, setLoading] = useState(true);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Fetch companies
    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const res = await fetch('/api/companies');
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        setCompanies(data);
                    } else if (data && Array.isArray(data.companies)) {
                        setCompanies(data.companies);
                    } else {
                        setCompanies([]);
                    }
                }
            } catch (err) {
                console.error('Error fetching companies:', err);
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
                    if (Array.isArray(data)) {
                        setTeams(data);
                    } else if (data && Array.isArray(data.departments)) {
                        setTeams(data.departments);
                    } else {
                        setTeams([]);
                    }
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
                    if (Array.isArray(data)) {
                        setEmployees(data);
                    } else if (data && Array.isArray(data.employees)) {
                        setEmployees(data.employees);
                    } else {
                        setEmployees([]);
                    }
                }
            } catch (err) {
                console.error('Error fetching employees:', err);
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
            search: '',
            searchType: 'all',
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
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4 space-y-4">
            {/* Top Row: Search & Date & Toggle Advanced */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                {/* Search */}
                <div className="relative w-full md:w-1/2 flex gap-2">
                    <select
                        value={filters.searchType || 'all'}
                        onChange={(e) => handleFilterChange('searchType', e.target.value)}
                        className="w-1/3 min-w-[120px] rounded-lg border border-secondary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-secondary-50"
                    >
                        <option value="all">All Fields</option>
                        <option value="name">Name</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="id">Employee ID</option>
                    </select>
                    <div className="relative w-2/3">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={filters.search || ''}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-secondary-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        />
                    </div>
                </div>

                {/* Date Range (Simplified visually) */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex items-center border border-secondary-300 rounded-lg px-3 py-2 bg-white">
                        <Calendar className="w-4 h-4 text-secondary-400 mr-2" />
                        <input
                            type="date"
                            value={filters.dateRange.start}
                            onChange={(e) => handleDateChange('start', e.target.value)}
                            className="text-sm border-none p-0 focus:ring-0 text-secondary-600 w-32 outline-none"
                        />
                        <span className="mx-2 text-secondary-400">to</span>
                        <input
                            type="date"
                            value={filters.dateRange.end}
                            onChange={(e) => handleDateChange('end', e.target.value)}
                            className="text-sm border-none p-0 focus:ring-0 text-secondary-600 w-32 outline-none"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className={`p-2 rounded-lg border transition-colors ${showAdvanced ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-secondary-300 text-secondary-600 hover:bg-secondary-50'}`}
                        title="Toggle Filters"
                    >
                        <Filter className="w-4 h-4" />
                    </button>
                    {(filters.companyId !== 'all' || filters.status !== 'all' || filters.search) && (
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-1 px-3 py-2 bg-secondary-100 text-secondary-700 rounded-lg text-sm font-medium hover:bg-secondary-200 transition-colors"
                        >
                            <X className="w-4 h-4" />
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Advanced Filters (Expandable) */}
            {showAdvanced && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-secondary-100 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div>
                        <label className="block text-xs font-semibold text-secondary-500 mb-1.5 uppercase tracking-wide">Company</label>
                        <div className="relative">
                            <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
                            <select
                                value={filters.companyId}
                                onChange={(e) => handleFilterChange('companyId', e.target.value)}
                                className="w-full pl-9 pr-4 py-2 rounded-lg border border-secondary-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none bg-white"
                            >
                                <option value="all">All Companies</option>
                                {companies.map((company) => (
                                    <option key={company.id} value={company.id}>
                                        {company.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-secondary-500 mb-1.5 uppercase tracking-wide">Department</label>
                        <select
                            value={filters.teamId}
                            onChange={(e) => handleFilterChange('teamId', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-secondary-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                            disabled={filters.companyId === 'all'}
                        >
                            <option value="all">All Departments</option>
                            {teams.map((team) => (
                                <option key={team.id} value={team.id}>
                                    {team.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-secondary-500 mb-1.5 uppercase tracking-wide">Employee</label>
                        <div className="relative">
                            <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
                            <select
                                value={filters.employeeId}
                                onChange={(e) => handleFilterChange('employeeId', e.target.value)}
                                className="w-full pl-9 pr-4 py-2 rounded-lg border border-secondary-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none bg-white"
                            >
                                <option value="all">All Employees</option>
                                {employees.map((employee) => (
                                    <option key={employee.id} value={employee.id}>
                                        {employee.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-secondary-500 mb-1.5 uppercase tracking-wide">Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-secondary-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        >
                            <option value="all">All Status</option>
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                            <option value="ON_LEAVE">On Leave</option>
                            <option value="TERMINATED">Terminated</option>
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
}
