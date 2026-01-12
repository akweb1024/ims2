import { useState } from 'react';

interface RecruitmentBoardProps {
    jobs: any[];
    applications: any[];
    onCreateJob: () => void;
    onEditJob: (job: any) => void;
}

export default function RecruitmentBoard({ jobs, applications, onCreateJob, onEditJob }: RecruitmentBoardProps) {
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [search, setSearch] = useState('');

    const filteredJobs = jobs.filter(j =>
        j.title.toLowerCase().includes(search.toLowerCase()) ||
        j.type.toLowerCase().includes(search.toLowerCase())
    );
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Job Postings */}
            <div className="space-y-6">
                <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-secondary-100 shadow-sm">
                    <div>
                        <h3 className="text-xl font-bold text-secondary-900">Active Job Postings</h3>
                        <p className="text-secondary-500 text-sm">Manage open positions ({filteredJobs.length})</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex gap-1 p-1 bg-secondary-100 rounded-lg">
                            <button onClick={() => setViewMode('grid')} className={`px-2 py-1 rounded-md text-[10px] font-black uppercase transition-all ${viewMode === 'grid' ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-400'}`}>Grid</button>
                            <button onClick={() => setViewMode('table')} className={`px-2 py-1 rounded-md text-[10px] font-black uppercase transition-all ${viewMode === 'table' ? 'bg-white text-primary-600 shadow-sm' : 'text-secondary-400'}`}>Table</button>
                        </div>
                        <input
                            type="text"
                            placeholder="Search jobs..."
                            className="input h-9 text-xs w-40"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredJobs.map(job => (
                            <div key={job.id} className="card-premium p-6 hover:shadow-xl transition-all group relative cursor-pointer" onClick={() => onEditJob(job)}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`px-2 py-0.5 text-[10px] font-black rounded uppercase ${job.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700' : 'bg-secondary-100 text-secondary-500'}`}>
                                        {job.status}
                                    </span>
                                    <span className="text-[10px] font-bold text-secondary-400">{new Date(job.createdAt).toLocaleDateString()}</span>
                                </div>
                                <h4 className="font-bold text-secondary-900 mb-1">{job.title}</h4>
                                <p className="text-xs text-secondary-500 mb-4">{job.type.replace('_', ' ')} • {job.salaryRange}</p>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1 rounded-full shadow-sm">
                                    <span className="text-xs text-primary-600 font-bold">✎ Edit</span>
                                </div>
                                <div className="flex -space-x-2 overflow-hidden">
                                    {Array.from({ length: Math.min(3, job._count?.applications || 0) }).map((_, i) => (
                                        <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-secondary-200" />
                                    ))}
                                    {(job._count?.applications || 0) > 3 && (
                                        <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-secondary-100 flex items-center justify-center text-[8px] font-bold text-secondary-500">+{job._count.applications - 3}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="card-premium p-0 overflow-hidden">
                        <table className="table w-full text-left">
                            <thead>
                                <tr className="bg-secondary-50/50 text-[10px] font-black text-secondary-400 uppercase tracking-widest border-b border-secondary-100">
                                    <th className="p-4">Position</th>
                                    <th className="p-4">Type</th>
                                    <th className="p-4">Salary</th>
                                    <th className="p-4">Applicants</th>
                                    <th className="p-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-50">
                                {filteredJobs.map(job => (
                                    <tr key={job.id} className="hover:bg-secondary-50/30 cursor-pointer" onClick={() => onEditJob(job)}>
                                        <td className="p-4">
                                            <p className="font-bold text-secondary-900 text-xs">{job.title}</p>
                                            <p className="text-[9px] text-secondary-400 uppercase font-bold">Posted: {new Date(job.createdAt).toLocaleDateString()}</p>
                                        </td>
                                        <td className="p-4 text-xs font-medium text-secondary-600">
                                            {job.type.replace('_', ' ')}
                                        </td>
                                        <td className="p-4 text-xs font-black text-secondary-900">
                                            {job.salaryRange}
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-black">{job._count?.applications || 0}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase ${job.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700' : 'bg-secondary-100 text-secondary-500'}`}>
                                                {job.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div onClick={onCreateJob} className="card-premium p-6 border-dashed border-2 border-secondary-200 flex flex-col items-center justify-center text-secondary-400 hover:border-primary-300 hover:text-primary-500 cursor-pointer transition-all">
                    <span className="text-3xl mb-2">+</span>
                    <span className="font-bold text-sm">Create Opening</span>
                </div>
            </div>

            {/* Application Pipeline */}
            <div className="card-premium overflow-hidden">
                <div className="p-6 border-b border-secondary-50">
                    <h3 className="text-lg font-black text-secondary-900 uppercase tracking-widest">Candidate Pipeline</h3>
                </div>
                <table className="table">
                    <thead>
                        <tr className="text-[10px] uppercase font-bold text-secondary-400 border-b border-secondary-50">
                            <th className="p-4">Candidate</th>
                            <th className="p-4">Applied For</th>
                            <th className="p-4 text-center">AI Match Score</th>
                            <th className="p-4 text-center">Stage</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-50">
                        {applications.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-10 text-secondary-400 font-bold italic">No active applications.</td></tr>
                        ) : applications.map(app => (
                            <tr key={app.id} className="hover:bg-secondary-50/50 group">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs">
                                            {app.applicantName[0]}
                                        </div>
                                        <div>
                                            <p className="font-bold text-secondary-900">{app.applicantName}</p>
                                            <p className="text-[10px] text-secondary-400">{app.applicantEmail}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 font-bold text-secondary-600 text-xs">{app.jobPosting.title}</td>
                                <td className="p-4 text-center">
                                    {/* Simulated AI Score */}
                                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-accent-50 text-accent-700 text-xs font-black border border-accent-100">
                                        <span>🤖</span> {Math.floor(Math.random() * (98 - 70) + 70)}%
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    <span className={`px-2 py-1 text-[10px] font-black rounded uppercase ${app.status === 'APPLIED' ? 'bg-primary-50 text-primary-700' :
                                        app.status.includes('INTERVIEW') ? 'bg-warning-50 text-warning-700' :
                                            app.status === 'SELECTED' ? 'bg-success-50 text-success-700' : 'bg-secondary-100 text-secondary-500'
                                        }`}>
                                        {app.status}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <button className="text-primary-600 font-bold text-[10px] uppercase hover:underline opacity-0 group-hover:opacity-100 transition-opacity">View Profile</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
