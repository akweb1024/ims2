'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ExamPortal() {
    const { applicationId } = useParams();
    const router = useRouter();
    const [examData, setExamData] = useState<any>(null);
    const [answers, setAnswers] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState<any>(null);

    const fetchExam = useCallback(async () => {
        const res = await fetch(`/api/recruitment/exam?applicationId=${applicationId}`);
        if (res.ok) {
            const data = await res.json();
            setExamData(data);
            setAnswers(new Array(data.questions.length).fill(-1));
        }
        setLoading(false);
    }, [applicationId]);

    useEffect(() => {
        fetchExam();
    }, [fetchExam]);

    const handleSubmit = async () => {
        if (answers.includes(-1)) {
            alert('Please answer all questions before submitting.');
            return;
        }

        const res = await fetch('/api/recruitment/exam', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ applicationId, answers })
        });

        if (res.ok) {
            setResult(await res.json());
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-secondary-400 uppercase tracking-widest">Entering Exam Hall...</div>;

    if (result) return (
        <div className="min-h-screen bg-secondary-900 flex items-center justify-center p-4">
            <div className="card-premium p-12 bg-white max-w-md w-full text-center space-y-6 shadow-2xl">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner ${result.isPassed ? 'bg-success-100 text-success-600' : 'bg-danger-100 text-danger-600'}`}>
                    {result.isPassed ? '🎯' : '❌'}
                </div>
                <div>
                    <h2 className="text-4xl font-black text-secondary-900">{result.score.toFixed(1)}%</h2>
                    <p className="text-secondary-400 font-bold uppercase tracking-widest mt-2">{result.isPassed ? 'Exam Passed' : 'Exam Failed'}</p>
                </div>
                <p className="text-secondary-600 leading-relaxed font-medium">
                    {result.isPassed
                        ? "Congratulations! You've qualified for the next round. Our recruitment team will contact you shortly for Level 1 interview."
                        : "Thank you for your interest. Unfortunately, your score did not meet the 75% threshold for this role."
                    }
                </p>
                <button
                    onClick={() => router.push('/recruitment')}
                    className="btn btn-secondary w-full py-4 rounded-xl font-bold"
                >
                    Back to Jobs
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-secondary-50 py-12 px-4">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="flex justify-between items-center bg-white p-6 rounded-[1.5rem] shadow-sm border border-secondary-200">
                    <h1 className="text-2xl font-black text-secondary-900">Online Entrance Exam</h1>
                    <div className="px-5 py-2 bg-secondary-900 text-white rounded-xl font-mono text-xl font-bold">30:00</div>
                </div>

                <div className="space-y-6">
                    {examData?.questions.map((q: any, qIdx: number) => (
                        <div key={qIdx} className="card-premium p-8 bg-white border border-secondary-100">
                            <h3 className="text-lg font-bold text-secondary-900 mb-6 flex gap-4">
                                <span className="text-primary-600">Q{qIdx + 1}.</span> {q.question}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {q.options.map((opt: string, oIdx: number) => (
                                    <button
                                        key={oIdx}
                                        onClick={() => {
                                            const newAns = [...answers];
                                            newAns[qIdx] = oIdx;
                                            setAnswers(newAns);
                                        }}
                                        className={`p-4 rounded-xl border-2 text-left transition-all font-medium ${answers[qIdx] === oIdx
                                            ? 'border-primary-600 bg-primary-50 text-primary-900 shadow-md'
                                            : 'border-secondary-100 hover:border-secondary-300 text-secondary-600'}`}
                                    >
                                        <span className="inline-block w-8 h-8 rounded-lg bg-secondary-100 text-center leading-8 font-bold mr-3">{String.fromCharCode(65 + oIdx)}</span>
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-center pt-8 pb-20">
                    <button
                        onClick={handleSubmit}
                        className="btn btn-primary px-20 py-4 rounded-[2rem] text-xl font-black shadow-2xl hover:scale-105 transition-all"
                    >
                        Submit Final Answers
                    </button>
                </div>
            </div>
        </div>
    );
}
