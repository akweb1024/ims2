import {
    ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
    BarChart, Bar, Legend
} from 'recharts';

export default function WorkforceAnalytics({ companyId }: { companyId?: string }) {
    const [employees, setEmployees] = useState<any[]>([]);
    const [deptPerformance, setDeptPerformance] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [companyId]);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const url = companyId
                ? `/api/analytics/company/employees?companyId=${companyId}`
                : '/api/analytics/company/employees';

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setEmployees(data.employees || []);
                setDeptPerformance(data.departmentPerformance || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="h-64 flex items-center justify-center">Analyzing Workforce...</div>;

    // Prepare Data for Talent Grid (Rating vs Tasks)
    const scatterData = employees.map(e => ({
        x: parseFloat(e.metrics.rating),
        y: e.metrics.tasks,
        z: 100, // Bubble size
        name: e.name,
        role: e.designation
    }));

    const dueForIncrement = employees.filter(e =>
        ['INCREMENT', 'PROMOTE_OR_HIKE', 'BONUS', 'INCENTIVE'].includes(e.advisor.status)
    );

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Talent Grid Chart */}
                <div className="card-premium p-6 lg:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg text-secondary-900">Talent Matrix</h3>
                        <div className="flex items-center gap-4">
                            <span className="text-xs bg-secondary-100 text-secondary-600 px-2 py-1 rounded">X: Rating (5) | Y: Output</span>
                        </div>
                    </div>
                    <div className="h-96 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis type="number" dataKey="x" name="Rating" domain={[0, 5]} unit="/5" stroke="#6B7280" fontSize={12} />
                                <YAxis type="number" dataKey="y" name="Tasks" unit=" tasks" stroke="#6B7280" fontSize={12} />
                                <ZAxis type="number" dataKey="z" range={[60, 400]} />
                                <Tooltip
                                    cursor={{ strokeDasharray: '3 3' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Scatter name="Employees" data={scatterData}>
                                    {scatterData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.x >= 4.5 ? '#10B981' : entry.x >= 3.5 ? '#4F46E5' : '#F59E0B'} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 text-xs font-bold mt-4">
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#10B981] rounded-full"></div> Top Talent</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#4F46E5] rounded-full"></div> Core Performer</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#F59E0B] rounded-full"></div> Growth Needed</div>
                    </div>
                </div>

                {/* Quick Stats Column */}
                <div className="space-y-4">
                    <div className="card-premium p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none">
                        <p className="font-bold opacity-80 uppercase text-xs tracking-wider">Employees Tracked</p>
                        <p className="text-4xl font-extrabold mt-1">{employees.length}</p>
                        <div className="mt-4 pt-4 border-t border-white/20 flex justify-between items-center">
                            <span className="text-xs opacity-80">Full Workforce</span>
                            <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded">Active</span>
                        </div>
                    </div>
                    <div className="card-premium p-6 border-l-4 border-l-amber-500">
                        <p className="font-bold text-secondary-500 uppercase text-xs tracking-wider">Due for Appraisal</p>
                        <p className="text-4xl font-extrabold text-secondary-900 mt-1">{dueForIncrement.length}</p>
                        <p className="text-xs text-secondary-500 mt-2 flex items-center gap-1">
                            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                            Priority based on cycle
                        </p>
                    </div>
                    <div className="card-premium p-6 border-l-4 border-l-success-500">
                        <p className="font-bold text-secondary-500 uppercase text-xs tracking-wider">Avg Productivity</p>
                        <p className="text-4xl font-extrabold text-secondary-900 mt-1">
                            {employees.length > 0 ? (employees.reduce((s, e) => s + e.metrics.tasks, 0) / employees.length).toFixed(0) : 0}
                        </p>
                        <p className="text-xs text-secondary-500 mt-2">Completed tasks / Employee</p>
                    </div>
                </div>
            </div>

            {/* Department Performance Bar Chart */}
            <div className="card-premium p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl text-secondary-900">Departmental Intelligence</h3>
                    <div className="text-xs text-secondary-500">Cross-department efficiency comparison</div>
                </div>
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={deptPerformance} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} stroke="#6B7280" fontSize={12} />
                            <YAxis axisLine={false} tickLine={false} stroke="#6B7280" fontSize={12} />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                cursor={{ fill: '#F9FAFB' }}
                            />
                            <Legend iconType="circle" />
                            <Bar dataKey="avgProductivity" name="Efficiency (Tasks/Capita)" fill="#4F46E5" radius={[6, 6, 0, 0]} barSize={40} />
                            <Bar dataKey="avgRating" name="Avg Rating" fill="#10B981" radius={[6, 6, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Increment Advisor Table */}
            <div className="card-premium p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl text-secondary-900 flex items-center gap-2">
                        <span className="p-2 bg-amber-100 rounded-lg text-lg">💡</span>
                        Increment Advisor
                    </h3>
                    <span className="text-xs font-bold bg-secondary-100 text-secondary-600 px-3 py-1 rounded-full border border-secondary-200">
                        AI Suggested Hikes
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="table w-full text-left text-sm">
                        <thead className="bg-secondary-50 text-secondary-500 font-bold">
                            <tr>
                                <th className="p-4 rounded-tl-xl">Employee</th>
                                <th className="p-4">Role & Dept</th>
                                <th className="p-4">Performance</th>
                                <th className="p-4">Review Gap</th>
                                <th className="p-4">Recommendation</th>
                                <th className="p-4 rounded-tr-xl">Rationale</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-100">
                            {dueForIncrement.length > 0 ? dueForIncrement.map(emp => (
                                <tr key={emp.id} className="hover:bg-secondary-50 transition-colors">
                                    <td className="p-4 font-bold text-secondary-900">{emp.name}</td>
                                    <td className="p-4">
                                        <p className="text-secondary-800 font-medium">{emp.designation}</p>
                                        <p className="text-[10px] text-secondary-400 uppercase tracking-tighter">{emp.department}</p>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${parseFloat(emp.metrics.rating) >= 4 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {emp.metrics.rating} ★
                                            </span>
                                            <span className="text-xs text-secondary-400">({emp.metrics.tasks} tasks)</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-secondary-600 font-medium">{emp.advisor.monthsSinceReview} months</td>
                                    <td className="p-4">
                                        <span className={`badge px-3 py-1 rounded-lg border ${emp.advisor.status === 'PROMOTE_OR_HIKE' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                            emp.advisor.status === 'INCREMENT' ? 'bg-green-50 text-green-700 border-green-200' :
                                                'bg-amber-50 text-amber-700 border-amber-200'
                                            }`}>
                                            {emp.advisor.status.replace(/_/g, ' ')}
                                            {emp.advisor.suggestedIncrement > 0 && ` (+${emp.advisor.suggestedIncrement}%)`}
                                        </span>
                                    </td>
                                    <td className="p-4 text-xs text-secondary-500 italic max-w-xs">{emp.advisor.reason}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-secondary-400">
                                        <div className="text-4xl mb-2">🔭</div>
                                        No appraisal recommendations found for the current period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}



