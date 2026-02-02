'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, MapPin, Briefcase, DollarSign, Filter } from 'lucide-react';

export default function CareersPage() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
    const [showFiltersMobile, setShowFiltersMobile] = useState(false);

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const res = await fetch('/api/recruitment/jobs');
            if (res.ok) setJobs(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    // Derived unique values for filters
    const departments = useMemo(() => Array.from(new Set(jobs.map(j => j.department?.name).filter(Boolean))), [jobs]);
    const jobTypes = useMemo(() => Array.from(new Set(jobs.map(j => j.type))), [jobs]);
    const locations = useMemo(() => Array.from(new Set(jobs.map(j => j.location).filter(Boolean))), [jobs]);

    // Filter Logic
    const filteredJobs = jobs.filter(job => {
        const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = selectedDepartments.length === 0 || (job.department?.name && selectedDepartments.includes(job.department.name));
        const matchesType = selectedTypes.length === 0 || selectedTypes.includes(job.type);
        const matchesLoc = selectedLocations.length === 0 || (job.location && selectedLocations.includes(job.location));

        return matchesSearch && matchesDept && matchesType && matchesLoc;
    });

    const toggleFilter = (item: string, current: string[], setter: (v: string[]) => void) => {
        if (current.includes(item)) {
            setter(current.filter(i => i !== item));
        } else {
            setter([...current, item]);
        }
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedDepartments([]);
        setSelectedTypes([]);
        setSelectedLocations([]);
    };

    return (
        <div className="min-h-screen bg-secondary-50 font-sans text-secondary-900">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-secondary-200 sticky top-0 z-40 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-black text-xl">S</div>
                        <span className="font-extrabold text-xl tracking-tight text-secondary-900">STM <span className="text-primary-600">Careers</span></span>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <div className="bg-secondary-900 text-white py-20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500 rounded-full blur-[128px] opacity-20 -mr-20 -mt-20"></div>
                <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                    <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight">Join the <span className="text-primary-400">Revolution.</span></h1>
                    <p className="text-lg text-secondary-400 max-w-2xl mx-auto">Find your next role at STM and help us build the future of intelligence.</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="flex flex-col lg:flex-row gap-10">

                    {/* Mobile Filter Toggle */}
                    <button
                        className="lg:hidden flex items-center justify-center gap-2 w-full bg-white p-4 rounded-xl border border-secondary-200 font-bold shadow-sm text-secondary-700"
                        onClick={() => setShowFiltersMobile(!showFiltersMobile)}
                    >
                        <Filter size={18} /> {showFiltersMobile ? 'Hide Filters' : 'Show Filters'}
                    </button>

                    {/* Sidebar Filters */}
                    <div className={`lg:w-1/4 space-y-8 ${showFiltersMobile ? 'block' : 'hidden lg:block'}`}>

                        {/* Search */}
                        <div className="card-premium">
                            <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-widest mb-4">Search</h3>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Job title, keywords..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-secondary-50 border border-secondary-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all text-secondary-900 placeholder:text-secondary-400"
                                />
                            </div>
                        </div>

                        {/* Departments */}
                        {departments.length > 0 && (
                            <div className="card-premium animate-in fade-in slide-in-from-left-4 duration-500">
                                <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-widest mb-4">Department</h3>
                                <div className="space-y-2">
                                    {departments.map((dept: any) => (
                                        <label key={dept} className="flex items-center gap-3 cursor-pointer group">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedDepartments.includes(dept) ? 'bg-primary-600 border-primary-600' : 'border-secondary-300 bg-secondary-50 group-hover:border-primary-400'}`}>
                                                {selectedDepartments.includes(dept) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                            <input type="checkbox" className="hidden" checked={selectedDepartments.includes(dept)} onChange={() => toggleFilter(dept, selectedDepartments, setSelectedDepartments)} />
                                            <span className={`text-sm font-bold ${selectedDepartments.includes(dept) ? 'text-primary-900' : 'text-secondary-600'}`}>{dept}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Job Type */}
                        {jobTypes.length > 0 && (
                            <div className="card-premium animate-in fade-in slide-in-from-left-4 duration-700">
                                <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-widest mb-4">Job Type</h3>
                                <div className="space-y-2">
                                    {jobTypes.map((type: any) => (
                                        <label key={type} className="flex items-center gap-3 cursor-pointer group">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedTypes.includes(type) ? 'bg-primary-600 border-primary-600' : 'border-secondary-300 bg-secondary-50 group-hover:border-primary-400'}`}>
                                                {selectedTypes.includes(type) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                            <input type="checkbox" className="hidden" checked={selectedTypes.includes(type)} onChange={() => toggleFilter(type, selectedTypes, setSelectedTypes)} />
                                            <span className={`text-sm font-bold capitalize ${selectedTypes.includes(type) ? 'text-primary-900' : 'text-secondary-600'}`}>{type.replace(/_/g, ' ').toLowerCase()}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Location */}
                        {locations.length > 0 && (
                            <div className="card-premium animate-in fade-in slide-in-from-left-4 duration-1000">
                                <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-widest mb-4">Location</h3>
                                <div className="space-y-2">
                                    {locations.map((loc: any) => (
                                        <label key={loc} className="flex items-center gap-3 cursor-pointer group">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedLocations.includes(loc) ? 'bg-primary-600 border-primary-600' : 'border-secondary-300 bg-secondary-50 group-hover:border-primary-400'}`}>
                                                {selectedLocations.includes(loc) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                            <input type="checkbox" className="hidden" checked={selectedLocations.includes(loc)} onChange={() => toggleFilter(loc, selectedLocations, setSelectedLocations)} />
                                            <span className={`text-sm font-bold ${selectedLocations.includes(loc) ? 'text-primary-900' : 'text-secondary-600'}`}>{loc}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button onClick={clearFilters} className="w-full py-2 text-xs font-bold text-secondary-400 hover:text-primary-600 hover:bg-secondary-100 rounded-lg transition-colors">
                            Reset All Filters
                        </button>
                    </div>

                    {/* Job List */}
                    <div className="lg:w-3/4">
                        <div className="mb-6 flex justify-between items-center">
                            <h2 className="text-xl font-black text-secondary-900">{filteredJobs.length} Open Positions</h2>
                            <span className="text-xs font-bold text-secondary-400 uppercase hidden md:block">Showing all available roles</span>
                        </div>

                        {isLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-40 bg-white rounded-3xl border border-secondary-100 animate-pulse"></div>
                                ))}
                            </div>
                        ) : filteredJobs.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-3xl border border-secondary-200 border-dashed">
                                <div className="text-4xl mb-4">🔍</div>
                                <h3 className="text-xl font-bold text-secondary-900 mb-2">No jobs found</h3>
                                <p className="text-secondary-500 mb-6">Try adjusting your search criteria.</p>
                                <button onClick={clearFilters} className="text-primary-600 font-bold hover:underline">Clear all filters</button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {filteredJobs.map(job => (
                                    <Link key={job.id} href={`/careers/${job.id}`} className="group card-premium hover:border-primary-200 hover:shadow-xl hover:shadow-primary-900/5 transition-all flex flex-col items-start h-full">
                                        <div className="flex justify-between w-full mb-4">
                                            <span className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{job.type.replace(/_/g, ' ')}</span>
                                            {job.department && <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">{job.department.name}</span>}
                                        </div>

                                        <h3 className="text-xl font-bold text-secondary-900 mb-2 group-hover:text-primary-600 transition-colors leading-tight">{job.title}</h3>

                                        <div className="space-y-2 mt-2 mb-6 w-full">
                                            <div className="flex items-center gap-2 text-secondary-500 text-sm font-medium">
                                                <MapPin size={14} className="text-primary-400" />
                                                {job.location || 'Remote'}
                                            </div>
                                            <div className="flex items-center gap-2 text-secondary-500 text-sm font-medium">
                                                <DollarSign size={14} className="text-success-500" />
                                                {job.salaryRange || 'Competitive'}
                                            </div>
                                        </div>

                                        <div className="mt-auto pt-6 w-full border-t border-secondary-50 flex justify-between items-center">
                                            <span className="text-xs font-bold text-secondary-400 uppercase group-hover:text-primary-600 transition-colors">View Details</span>
                                            <span className="w-8 h-8 rounded-full bg-secondary-50 flex items-center justify-center text-secondary-400 group-hover:bg-primary-600 group-hover:text-white transition-all transform group-hover:translate-x-1">→</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
