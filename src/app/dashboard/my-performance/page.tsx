'use client';

import { useCallback, useEffect, useState } from 'react';
import { FiTarget, FiTrendingUp } from 'react-icons/fi';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { kraFetch, PERIOD_TYPES } from '@/lib/kra/client';

interface IndexData {
  period: string;
  overallIndex: number;
  grade: string;
  achievementScore: number;
  attendanceScore: number;
  managerRatingScore: number;
  focusScore: number;
}
interface MyGoal {
  id: string;
  title: string;
  unit: string;
  target: number;
  current: number;
  achievementPercentage: number;
  dataSource: string | null;
  status: string;
}

const gradeColor = (g: string) =>
  g === 'A' ? 'text-green-600' : g === 'B' ? 'text-blue-600' : g === 'C' ? 'text-amber-600' : 'text-red-600';

export default function MyPerformancePage() {
  const [periodType, setPeriodType] = useState('MONTHLY');
  const [index, setIndex] = useState<IndexData | null>(null);
  const [goals, setGoals] = useState<MyGoal[]>([]);
  const [summary, setSummary] = useState<{ weightedAchievement: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [perf, my] = await Promise.all([
        kraFetch<{ index: IndexData }>(`/api/kra/performance?self=1&periodType=${periodType}`),
        kraFetch<{ goals: MyGoal[]; summary: { weightedAchievement: number } }>(`/api/kra/my?periodType=${periodType}`),
      ]);
      setIndex(perf.index);
      setGoals(my.goals || []);
      setSummary(my.summary || null);
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }, [periodType]);
  useEffect(() => { load(); }, [load]);

  const components = index ? [
    { label: 'Goal Achievement', value: index.achievementScore, weight: '45%' },
    { label: 'Attendance', value: index.attendanceScore, weight: '20%' },
    { label: 'Manager Rating', value: index.managerRatingScore, weight: '20%' },
    { label: 'KRA Focus', value: index.focusScore, weight: '15%' },
  ] : [];

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FiTrendingUp className="text-indigo-600" /> My Performance
            </h1>
            <p className="text-sm text-gray-500 mt-1">Aapke targets aur performance index — {periodType.toLowerCase()}.</p>
          </div>
          <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={periodType} onChange={(e) => setPeriodType(e.target.value)}>
            {PERIOD_TYPES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </header>

        {loading ? <p className="text-gray-500">Loading…</p> : (
          <>
            {/* Index hero */}
            <div className="grid sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-indigo-600 text-white rounded-2xl p-5 flex flex-col justify-center">
                <span className="text-xs uppercase tracking-wide opacity-80">Performance Index</span>
                <div className="flex items-end gap-2 mt-1">
                  <span className="text-4xl font-bold">{index?.overallIndex ?? 0}</span>
                  <span className={`text-2xl font-bold ${index ? '' : ''}`}>{index?.grade}</span>
                </div>
                <span className="text-xs opacity-80 mt-1">{index?.period}</span>
              </div>
              {components.map((c) => (
                <div key={c.label} className="border border-gray-200 rounded-2xl p-4">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{c.label}</span><span>{c.weight}</span>
                  </div>
                  <div className="text-2xl font-semibold text-gray-900 mt-1">{c.value}</div>
                  <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, c.value)}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* KRA goals */}
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <FiTarget className="text-indigo-600" /> My KRA Targets
              {summary && <span className="text-sm font-normal text-gray-400">· {summary.weightedAchievement}% overall</span>}
            </h2>

            {goals.length === 0 ? (
              <p className="text-gray-500">Is period ke liye koi KRA target assign nahi hua. Apne manager se baat karein.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {goals.map((g) => (
                  <div key={g.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{g.title}</h3>
                        <p className="text-xs text-gray-400">
                          {g.current} / {g.target} {g.unit}
                          {g.dataSource && <span className="ml-1">· {g.dataSource}</span>}
                        </p>
                      </div>
                      <span className={`text-sm font-semibold ${gradeColor(g.achievementPercentage >= 85 ? 'A' : g.achievementPercentage >= 70 ? 'B' : g.achievementPercentage >= 55 ? 'C' : 'D')}`}>
                        {Math.round(g.achievementPercentage)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full mt-3 overflow-hidden">
                      <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, g.achievementPercentage)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
