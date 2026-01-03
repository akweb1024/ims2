'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ExamContent() {
    const searchParams = useSearchParams();
    const applicationId = searchParams.get('appId');

    const [loading, setLoading] = useState(true);
    const [examData, setExamData] = useState<any>(null);
    const [answers, setAnswers] = useState<number[]>([]);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (applicationId) {
            fetchExam();
        } else {
            setError('Invalid Exam Link');
            setLoading(false);
        }
    }, [applicationId]);

    const fetchExam = async () => {
        try {
            const res = await fetch(`/api/recruitment/exam?applicationId=${applicationId}`);
            const data = await res.json();

            if (res.ok) {
                setExamData(data);
                setAnswers(new Array(data.questions.length).fill(-1));
            } else if (data.score !== undefined) {
                setResult({ score: data.score, isPassed: data.score >= 50 }); // Mock pass check for already attempted
            } else {
                setError(data.error || 'Failed to load exam');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (answers.includes(-1)) {
            alert('Please answer all questions before submitting.');
            return;
        }

        try {
            const res = await fetch('/api/recruitment/exam', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ applicationId, answers })
            });
            const data = await res.json();
            if (res.ok) {
                setResult(data);
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert('Submission failed');
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-500">Loading Exam...</div>;

    if (error) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-center max-w-md">
                <div className="text-4xl mb-4">⚠️</div>
                <h1 className="text-xl font-black text-slate-900 mb-2">Access Denied</h1>
                <p className="text-slate-500">{error}</p>
            </div>
        </div>
    );

    if (result) return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white p-12 rounded-3xl shadow-2xl max-w-lg w-full text-center animate-in zoom-in duration-300">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl mx-auto mb-6 ${result.isPassed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {result.isPassed ? '🏆' : '📚'}
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-2">{result.isPassed ? 'Congratulations!' : 'Keep Learning'}</h2>
                <p className="text-slate-500 mb-8 font-medium">You have {result.isPassed ? 'passed' : 'completed'} the assessment.</p>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-8">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Your Score</span>
                    <span className={`text-5xl font-black ${result.isPassed ? 'text-green-600' : 'text-slate-900'}`}>{result.score.toFixed(0)}%</span>
                </div>

                <p className="text-xs text-slate-400">You can now close this tab.</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 py-12 px-4 selection:bg-indigo-100">
            <div className="max-w-3xl mx-auto">
                <header className="mb-10 text-center">
                    <h1 className="text-3xl font-black text-slate-900 mb-2">Skill Assessment</h1>
                    <p className="text-slate-500">Please answer all questions carefully. This test is auto-proctored.</p>
                </header>

                <div className="space-y-6">
                    {examData.questions.map((q: any, idx: number) => (
                        <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                            <div className="flex gap-4 mb-6">
                                <span className="flex-shrink-0 w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-sm">{idx + 1}</span>
                                <h3 className="text-lg font-bold text-slate-900 leading-relaxed">{q.question}</h3>
                            </div>

                            <div className="space-y-3 pl-12">
                                {q.options.map((opt: string, optIdx: number) => (
                                    <label key={optIdx} className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${answers[idx] === optIdx ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 hover:border-slate-200'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${answers[idx] === optIdx ? 'border-indigo-600' : 'border-slate-300'}`}>
                                                {answers[idx] === optIdx && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full" />}
                                            </div>
                                            <span className={`font-medium ${answers[idx] === optIdx ? 'text-indigo-900' : 'text-slate-600'}`}>{opt}</span>
                                        </div>
                                        <input
                                            type="radio"
                                            name={`q-${idx}`}
                                            className="hidden"
                                            onChange={() => {
                                                const newAnswers = [...answers];
                                                newAnswers[idx] = optIdx;
                                                setAnswers(newAnswers);
                                            }}
                                        />
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-10 sticky bottom-6 z-10">
                    <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-white/20 flex justify-between items-center max-w-3xl mx-auto">
                        <div className="text-sm font-bold text-slate-500 pl-2">
                            {answers.filter(a => a !== -1).length} / {examData.questions.length} Answered
                        </div>
                        <button
                            onClick={handleSubmit}
                            className="btn bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-indigo-200 transition-all"
                        >
                            Submit Assessment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CandidateExamPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-slate-500">Loading Application...</div>}>
            <ExamContent />
        </Suspense>
    );
}
