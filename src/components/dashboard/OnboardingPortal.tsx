'use client';

import { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, Lock, PlayCircle, XCircle } from 'lucide-react';

export default function OnboardingPortal() {
    const [modules, setModules] = useState<any[]>([]);
    const [activeModule, setActiveModule] = useState<any>(null);
    const [takingQuiz, setTakingQuiz] = useState(false);
    const [loading, setLoading] = useState(true);

    // Quiz State
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [quizResult, setQuizResult] = useState<any>(null);

    useEffect(() => {
        fetchProgress();
    }, []);

    const fetchProgress = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/onboarding/progress', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setModules(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const startModule = (module: any) => {
        setActiveModule(module);
        setTakingQuiz(false);
        setQuizResult(null);
        setAnswers({});
    };

    const submitQuiz = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/onboarding/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    moduleId: activeModule.id,
                    answers
                })
            });

            if (res.ok) {
                const result = await res.json();
                setQuizResult(result);
                if (result.passed) {
                    // Refresh overall progress
                    fetchProgress();
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div className="p-8 text-center animate-pulse">Loading your training path...</div>;

    if (activeModule) {
        // CONTENT / QUIZ VIEW
        return (
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden min-h-[600px] flex flex-col">
                <div className="bg-secondary-900 text-white p-6 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black">{activeModule.title}</h2>
                        <p className="text-secondary-300 text-sm">{takingQuiz ? 'Final Assessment' : 'Study Material'}</p>
                    </div>
                    <button onClick={() => setActiveModule(null)} className="text-secondary-300 hover:text-white">Exit</button>
                </div>

                <div className="flex-1 p-8 overflow-y-auto">
                    {!takingQuiz ? (
                        <div className="prose max-w-none">
                            <div
                                className="text-secondary-700 leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: activeModule.content }}
                            />

                            <div className="mt-12 flex justify-center">
                                <button
                                    onClick={() => setTakingQuiz(true)}
                                    className="btn btn-primary btn-lg flex items-center gap-2"
                                >
                                    Proceed to Test <PlayCircle />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-2xl mx-auto space-y-8">
                            {quizResult ? (
                                <div className={`text-center p-8 rounded-2xl ${quizResult.passed ? 'bg-success-50 border border-success-200' : 'bg-danger-50 border border-danger-200'}`}>
                                    <div className="inline-block p-4 rounded-full bg-white mb-4 shadow-sm">
                                        {quizResult.passed ? <CheckCircle size={48} className="text-success-500" /> : <XCircle size={48} className="text-danger-500" />}
                                    </div>
                                    <h3 className={`text-2xl font-black mb-2 ${quizResult.passed ? 'text-success-800' : 'text-danger-800'}`}>
                                        {quizResult.passed ? 'Assessment Passed!' : 'Assessment Failed'}
                                    </h3>
                                    <p className="text-lg font-bold mb-4">Score: {quizResult.score.toFixed(0)}%</p>
                                    <p className="mb-6 text-sm">{quizResult.passed ? 'Great job! You have unlocked the next module.' : 'Please review the study material and try again.'}</p>

                                    <button
                                        onClick={() => {
                                            if (quizResult.passed) {
                                                setActiveModule(null);
                                            } else {
                                                setTakingQuiz(false); // Go back to content
                                                setQuizResult(null);
                                            }
                                        }}
                                        className={`btn ${quizResult.passed ? 'btn-success' : 'btn-outline'}`}
                                    >
                                        {quizResult.passed ? 'Continue Journey' : 'Review Material'}
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {activeModule.questions.map((q: any, idx: number) => (
                                        <div key={q.id} className="card p-6">
                                            <p className="font-bold text-lg mb-4">{idx + 1}. {q.question}</p>
                                            <div className="space-y-2">
                                                {q.options.map((opt: string, oIdx: number) => (
                                                    <label key={oIdx} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-secondary-50 transition-colors ${answers[q.id] === oIdx ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' : 'border-secondary-200'}`}>
                                                        <input
                                                            type="radio"
                                                            name={q.id}
                                                            checked={answers[q.id] === oIdx}
                                                            onChange={() => setAnswers({ ...answers, [q.id]: oIdx })}
                                                            className="text-primary-600 focus:ring-primary-500"
                                                        />
                                                        <span className="text-secondary-700">{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    <div className="flex justify-end pt-4">
                                        <button
                                            onClick={submitQuiz}
                                            disabled={Object.keys(answers).length < activeModule.questions.length}
                                            className="btn btn-primary w-full md:w-auto"
                                        >
                                            Submit Assessment
                                        </button>
                                    </div>
                                    {Object.keys(answers).length < activeModule.questions.length && (
                                        <p className="text-xs text-center text-secondary-400 mt-2">Please answer all questions to submit.</p>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-primary-600 to-indigo-600 rounded-2xl p-8 text-white relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-black mb-2">Onboarding Journey</h1>
                    <p className="text-primary-100 max-w-xl">
                        Complete these mandatory training modules to unlock your full employee profile benefits. You must pass each assessment to proceed.
                    </p>
                </div>
                <BookOpen className="absolute -bottom-8 -right-8 text-white opacity-10" size={200} />
            </div>

            <div className="grid gap-4">
                {modules.map((m: any, idx: number) => {
                    const isLocked = m.progress.status === 'LOCKED';
                    const isCompleted = m.progress.status === 'COMPLETED';

                    return (
                        <div
                            key={m.id}
                            className={`group relative overflow-hidden rounded-xl border-2 transition-all p-6 flex flex-col md:flex-row items-start md:items-center gap-6 ${isLocked ? 'bg-secondary-50 border-secondary-100 opacity-70 grayscale' : 'bg-white border-secondary-100 hover:border-primary-200 shadow-sm hover:shadow-md'}`}
                        >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${isCompleted ? 'bg-success-100 text-success-600' : isLocked ? 'bg-secondary-200 text-secondary-400' : 'bg-primary-100 text-primary-600'}`}>
                                {isCompleted ? <CheckCircle size={24} /> : isLocked ? <Lock size={24} /> : <PlayCircle size={24} />}
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-secondary-400">Step {idx + 1}</span>
                                    <span className={`text-[10px] font-bold uppercase py-0.5 px-2 rounded ${m.type === 'COMPANY' ? 'bg-blue-100 text-blue-700' : m.type === 'ROLE' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                                        {m.type}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-secondary-900">{m.title}</h3>
                                <p className="text-sm text-secondary-500 line-clamp-1">{m.description}</p>
                            </div>

                            <div className="flex items-center gap-4 w-full md:w-auto mt-2 md:mt-0">
                                {isCompleted && (
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-success-600">Passed</p>
                                        <p className="text-[10px] text-secondary-400">{new Date(m.progress.completedAt).toLocaleDateString()}</p>
                                    </div>
                                )}

                                <button
                                    disabled={isLocked}
                                    onClick={() => startModule(m)}
                                    className={`btn w-full md:w-auto ${isCompleted ? 'btn-outline text-xs' : 'btn-primary'} ${isLocked ? 'cursor-not-allowed' : ''}`}
                                >
                                    {isCompleted ? 'Review Content' : isLocked ? 'Locked' : 'Start Module'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
