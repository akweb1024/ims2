'use client';

import { useState } from 'react';
import { useOnboardingProgress, useOnboardingMutations } from '@/hooks/useHR';
import { CheckCircle2, Lock, Play, HelpCircle, Award, ChevronRight, BookOpen } from 'lucide-react';

export default function EmployeeOnboarding() {
    const { data: modules, isLoading } = useOnboardingProgress();
    const { updateProgress } = useOnboardingMutations();

    const [activeModule, setActiveModule] = useState<any>(null);
    const [quizMode, setQuizMode] = useState(false);
    const [quizAnswers, setQuizAnswers] = useState<any>({});
    const [quizResult, setQuizResult] = useState<any>(null);

    const handleQuizSubmit = async () => {
        try {
            const res = await updateProgress.mutateAsync({
                moduleId: activeModule.id,
                answers: quizAnswers
            });
            setQuizResult(res);
        } catch (err) {
            alert('Quiz submission failed');
        }
    };

    if (isLoading) return <div className="p-10 text-center font-bold text-secondary-400">Loading your onboarding...</div>;

    if (activeModule) {
        return (
            <div className="space-y-8 animate-in slide-in-from-right duration-500">
                <button
                    onClick={() => { setActiveModule(null); setQuizMode(false); setQuizResult(null); setQuizAnswers({}); }}
                    className="text-secondary-400 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 hover:text-secondary-900 transition-colors"
                >
                    &larr; Back to Curriculum
                </button>

                {!quizMode ? (
                    <div className="card-premium p-10 bg-white">
                        <div className="flex justify-between items-center mb-10 border-b border-secondary-50 pb-6">
                            <div>
                                <h3 className="text-3xl font-black text-secondary-900 tracking-tight">{activeModule.title}</h3>
                                <p className="text-secondary-500 font-medium mt-1">{activeModule.description}</p>
                            </div>
                            <div className="text-right">
                                <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${activeModule.progress?.status === 'COMPLETED' ? 'bg-success-50 text-success-700' : 'bg-primary-50 text-primary-700'}`}>
                                    {activeModule.progress?.status}
                                </span>
                            </div>
                        </div>

                        <div className="prose prose-secondary max-w-none prose-headings:font-black prose-headings:text-secondary-900 prose-p:text-secondary-600 prose-li:text-secondary-600">
                            <div dangerouslySetInnerHTML={{ __html: activeModule.content }} />
                        </div>

                        <div className="mt-16 flex justify-center border-t border-secondary-50 pt-10">
                            <button
                                onClick={() => setQuizMode(true)}
                                className="btn bg-primary-600 hover:bg-primary-700 text-white px-12 py-4 rounded-2xl flex items-center gap-3 shadow-xl transition-all font-bold uppercase tracking-widest text-xs"
                            >
                                Take Final Quiz <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-3xl mx-auto">
                        {!quizResult ? (
                            <div className="card-premium p-10">
                                <h3 className="text-2xl font-black text-secondary-900 mb-8 flex items-center gap-3">
                                    <HelpCircle className="text-primary-600" /> Module Assessment
                                </h3>
                                <div className="space-y-10">
                                    {activeModule.questions.map((q: any, qIdx: number) => (
                                        <div key={q.id} className="space-y-4">
                                            <p className="font-bold text-secondary-900 text-lg">{qIdx + 1}. {q.question}</p>
                                            <div className="grid grid-cols-1 gap-3">
                                                {q.options.map((opt: string, oIdx: number) => (
                                                    <label key={oIdx} className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-4 ${quizAnswers[q.id] === oIdx ? 'bg-primary-50 border-primary-500' : 'bg-white border-secondary-100 hover:border-secondary-300'}`}>
                                                        <input
                                                            type="radio"
                                                            name={q.id}
                                                            checked={quizAnswers[q.id] === oIdx}
                                                            onChange={() => setQuizAnswers({ ...quizAnswers, [q.id]: oIdx })}
                                                            className="radio radio-primary radio-sm"
                                                        />
                                                        <span className={`font-bold ${quizAnswers[q.id] === oIdx ? 'text-primary-900' : 'text-secondary-620'}`}>{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-12 flex justify-end">
                                    <button
                                        onClick={handleQuizSubmit}
                                        disabled={Object.keys(quizAnswers).length < activeModule.questions.length}
                                        className="btn bg-secondary-900 text-white px-12 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs disabled:opacity-50"
                                    >
                                        Submit Assessment
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="card-premium p-20 text-center animate-in zoom-in-95 duration-500">
                                <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-8 ${quizResult.passed ? 'bg-success-100 text-success-600' : 'bg-danger-100 text-danger-600'}`}>
                                    {quizResult.passed ? <Award size={48} /> : <BookOpen size={48} />}
                                </div>
                                <h3 className="text-4xl font-black text-secondary-900 tracking-tight mb-2">
                                    {quizResult.passed ? 'Congatulations!' : 'Keep Learning!'}
                                </h3>
                                <p className="text-secondary-500 text-lg mb-8">
                                    {quizResult.passed
                                        ? `You passed with a score of ${quizResult.score.toFixed(0)}%. Module completed.`
                                        : `You scored ${quizResult.score.toFixed(0)}%. You need 70% to pass.`
                                    }
                                </p>
                                <button
                                    onClick={() => {
                                        if (quizResult.passed) setActiveModule(null);
                                        setQuizResult(null);
                                        setQuizAnswers({});
                                        setQuizMode(false);
                                    }}
                                    className="btn bg-secondary-900 text-white px-12 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs"
                                >
                                    {quizResult.passed ? 'Close & Continue' : 'Retry Learning'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-in fade-in duration-500">
            <div className="lg:col-span-1 space-y-6">
                <div className="card-premium p-6 border-t-4 border-primary-500">
                    <h4 className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-4">Onboarding Progress</h4>
                    <div className="flex items-end gap-2 mb-2">
                        <span className="text-4xl font-black text-secondary-900">
                            {modules?.filter(m => m.progress?.status === 'COMPLETED').length}
                        </span>
                        <span className="text-secondary-400 font-bold mb-1">/ {modules?.length}</span>
                    </div>
                    <div className="w-full bg-secondary-100 h-2 rounded-full overflow-hidden">
                        <div
                            className="bg-primary-500 h-full transition-all duration-1000"
                            style={{ width: `${((modules?.filter(m => m.progress?.status === 'COMPLETED')?.length || 0) / (modules?.length || 1)) * 100}%` }}
                        ></div>
                    </div>
                </div>

                <div className="card-premium p-6 bg-secondary-900 text-white">
                    <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-secondary-400 mb-4">
                        <Award size={14} /> My Badges
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {modules?.filter(m => m.progress?.status === 'COMPLETED').map(m => (
                            <div key={m.id} className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-lg" title={m.title}>
                                🏆
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="lg:col-span-3 space-y-4">
                {modules?.map((m: any, idx: number) => {
                    const isLocked = m.progress?.status === 'LOCKED';
                    return (
                        <div
                            key={m.id}
                            onClick={() => !isLocked && setActiveModule(m)}
                            className={`card-premium group relative flex justify-between items-center p-8 transition-all duration-300 ${isLocked ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer hover:border-primary-300 hover:shadow-xl hover:-translate-y-1'}`}
                        >
                            <div className="flex items-center gap-8">
                                <div className="text-4xl font-black text-secondary-100 group-hover:text-primary-50 transition-colors">
                                    {(idx + 1).toString().padStart(2, '0')}
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h4 className="text-xl font-black text-secondary-900 tracking-tight">{m.title}</h4>
                                        {m.progress?.status === 'COMPLETED' && <CheckCircle2 className="text-success-500" size={20} />}
                                    </div>
                                    <p className="text-secondary-500 font-medium text-sm mt-1">{m.description}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {isLocked ? (
                                    <Lock size={20} className="text-secondary-300" />
                                ) : (
                                    <div className="flex flex-col items-end">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${m.progress?.status === 'COMPLETED' ? 'bg-success-50 text-success-700' : 'bg-primary-50 text-primary-700'}`}>
                                            {m.progress?.status === 'UNLOCKED' ? 'Ready to Start' : m.progress?.status}
                                        </span>
                                        {m.progress?.status === 'COMPLETED' && (
                                            <span className="text-[10px] font-bold text-secondary-400 mt-2">Score: {m.progress?.score.toFixed(0)}%</span>
                                        )}
                                    </div>
                                )}
                                {!isLocked && <ChevronRight size={24} className="text-secondary-200 group-hover:text-primary-500 transition-colors" />}
                            </div>
                        </div>
                    );
                })}

                {modules?.length === 0 && (
                    <div className="py-40 text-center card-premium border-dashed border-4 border-secondary-100 bg-secondary-50/20">
                        <BookOpen size={64} className="mx-auto text-secondary-200 mb-6" />
                        <h3 className="text-2xl font-black text-secondary-900 tracking-tight">Your curriculum is being prepared.</h3>
                        <p className="text-secondary-500 font-medium mt-2">Check back shortly for your specialized onboarding journey.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
