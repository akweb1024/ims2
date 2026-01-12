'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { CheckCircle, XCircle, Clock, Award, AlertCircle, ChevronRight } from 'lucide-react';

export default function QuizPage() {
    const router = useRouter();
    const params = useParams();
    const quizId = params.qid as string;

    const [quiz, setQuiz] = useState<any>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchQuiz();
    }, [quizId]);

    useEffect(() => {
        if (quiz?.timeLimit && timeLeft === null) {
            setTimeLeft(quiz.timeLimit * 60); // Convert minutes to seconds
        }
    }, [quiz]);

    useEffect(() => {
        if (timeLeft !== null && timeLeft > 0 && !submitted) {
            const timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev === null || prev <= 1) {
                        handleSubmit();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [timeLeft, submitted]);

    const fetchQuiz = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/quizzes/${quizId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setQuiz(data);

                if (!data.canAttempt) {
                    alert(`You have reached the maximum number of attempts (${data.maxAttempts})`);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (submitted) return;

        try {
            setSubmitted(true);
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/quizzes/${quizId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    answers,
                    timeSpent: quiz.timeLimit ? (quiz.timeLimit * 60 - (timeLeft || 0)) : null
                })
            });

            if (res.ok) {
                const data = await res.json();
                setResults(data);
            }
        } catch (error) {
            console.error(error);
            setSubmitted(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) return <div className="p-8 text-center">Loading quiz...</div>;
    if (!quiz) return <div className="p-8 text-center">Quiz not found</div>;

    if (!quiz.canAttempt) {
        return (
            <DashboardLayout userRole={userRole}>
                <div className="max-w-2xl mx-auto">
                    <div className="card-premium p-8 text-center">
                        <AlertCircle size={64} className="mx-auto text-warning-600 mb-4" />
                        <h2 className="text-2xl font-bold text-secondary-900 mb-2">Maximum Attempts Reached</h2>
                        <p className="text-secondary-600 mb-4">
                            You have used all {quiz.maxAttempts} attempts for this quiz.
                        </p>
                        {quiz.bestScore !== null && (
                            <p className="text-lg font-bold text-primary-600 mb-6">
                                Your best score: {Math.round(quiz.bestScore)}%
                            </p>
                        )}
                        <button
                            onClick={() => router.back()}
                            className="btn btn-primary"
                        >
                            Back to Course
                        </button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (results) {
        return (
            <DashboardLayout userRole={userRole}>
                <div className="max-w-2xl mx-auto">
                    <div className="card-premium p-8">
                        <div className="text-center mb-8">
                            {results.passed ? (
                                <CheckCircle size={64} className="mx-auto text-success-600 mb-4" />
                            ) : (
                                <XCircle size={64} className="mx-auto text-danger-600 mb-4" />
                            )}
                            <h2 className="text-3xl font-black text-secondary-900 mb-2">
                                {results.passed ? 'Congratulations!' : 'Not Passed'}
                            </h2>
                            <p className="text-secondary-600">
                                {results.passed
                                    ? 'You have successfully passed this quiz!'
                                    : `You need ${quiz.passingScore}% to pass. Keep trying!`
                                }
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="text-center p-4 bg-secondary-50 rounded-2xl">
                                <p className="text-3xl font-black text-secondary-900">{Math.round(results.score)}%</p>
                                <p className="text-sm text-secondary-500">Score</p>
                            </div>
                            <div className="text-center p-4 bg-secondary-50 rounded-2xl">
                                <p className="text-3xl font-black text-secondary-900">
                                    {results.earnedPoints}/{results.totalPoints}
                                </p>
                                <p className="text-sm text-secondary-500">Points</p>
                            </div>
                            <div className="text-center p-4 bg-secondary-50 rounded-2xl">
                                <p className="text-3xl font-black text-secondary-900">
                                    {quiz.userAttempts + 1}/{quiz.maxAttempts}
                                </p>
                                <p className="text-sm text-secondary-500">Attempts</p>
                            </div>
                        </div>

                        {results.correctAnswers && (
                            <div className="space-y-4 mb-6">
                                <h3 className="font-bold text-lg text-secondary-900">Review Answers</h3>
                                {quiz.questions.map((question: any, idx: number) => {
                                    const userAnswer = answers[question.id];
                                    const correctAnswer = results.correctAnswers.find(
                                        (a: any) => a.questionId === question.id
                                    );
                                    const isCorrect = userAnswer === correctAnswer?.correctAnswer;

                                    return (
                                        <div key={question.id} className="p-4 bg-secondary-50 rounded-2xl">
                                            <div className="flex items-start gap-3 mb-2">
                                                {isCorrect ? (
                                                    <CheckCircle size={20} className="text-success-600 flex-shrink-0 mt-1" />
                                                ) : (
                                                    <XCircle size={20} className="text-danger-600 flex-shrink-0 mt-1" />
                                                )}
                                                <div className="flex-1">
                                                    <p className="font-medium text-secondary-900 mb-2">
                                                        {idx + 1}. {question.question}
                                                    </p>
                                                    <p className="text-sm text-secondary-600">
                                                        Your answer: <span className={isCorrect ? 'text-success-700 font-bold' : 'text-danger-700 font-bold'}>
                                                            {userAnswer || 'Not answered'}
                                                        </span>
                                                    </p>
                                                    {!isCorrect && (
                                                        <p className="text-sm text-success-700 font-bold">
                                                            Correct answer: {correctAnswer?.correctAnswer}
                                                        </p>
                                                    )}
                                                    {correctAnswer?.explanation && (
                                                        <p className="text-sm text-secondary-500 mt-2 italic">
                                                            {correctAnswer.explanation}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex gap-2">
                            {!results.passed && quiz.userAttempts + 1 < quiz.maxAttempts && (
                                <button
                                    onClick={() => window.location.reload()}
                                    className="btn btn-primary flex-1"
                                >
                                    Try Again
                                </button>
                            )}
                            <button
                                onClick={() => router.back()}
                                className="btn btn-secondary flex-1"
                            >
                                Back to Course
                            </button>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    const question = quiz.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

    return (
        <DashboardLayout userRole={userRole}>
            <div className="max-w-3xl mx-auto">
                <div className="card-premium p-8">
                    {/* Header */}
                    <div className="mb-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h1 className="text-2xl font-black text-secondary-900">{quiz.title}</h1>
                                {quiz.description && (
                                    <p className="text-secondary-600">{quiz.description}</p>
                                )}
                            </div>
                            {timeLeft !== null && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-warning-50 rounded-xl">
                                    <Clock size={20} className="text-warning-600" />
                                    <span className="font-bold text-warning-700">{formatTime(timeLeft)}</span>
                                </div>
                            )}
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4">
                            <div className="flex justify-between text-sm font-bold text-secondary-500 mb-2">
                                <span>Question {currentQuestion + 1} of {quiz.questions.length}</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="h-2 bg-secondary-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>

                        {/* Quiz Info */}
                        <div className="flex gap-4 text-sm text-secondary-500">
                            <span>Passing Score: {quiz.passingScore}%</span>
                            <span>•</span>
                            <span>Attempt {quiz.userAttempts + 1} of {quiz.maxAttempts}</span>
                        </div>
                    </div>

                    {/* Question */}
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-secondary-900 mb-6">
                            {question.question}
                        </h2>

                        {question.type === 'MULTIPLE_CHOICE' && question.options && (
                            <div className="space-y-3">
                                {(question.options as string[]).map((option: string, idx: number) => (
                                    <button
                                        key={idx}
                                        onClick={() => setAnswers({ ...answers, [question.id]: option })}
                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${answers[question.id] === option
                                                ? 'border-primary-500 bg-primary-50'
                                                : 'border-secondary-200 bg-white hover:border-primary-200'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${answers[question.id] === option
                                                    ? 'border-primary-500 bg-primary-500'
                                                    : 'border-secondary-300'
                                                }`}>
                                                {answers[question.id] === option && (
                                                    <CheckCircle size={16} className="text-white" />
                                                )}
                                            </div>
                                            <span className="font-medium text-secondary-900">{option}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {question.type === 'TRUE_FALSE' && (
                            <div className="space-y-3">
                                {['True', 'False'].map((option) => (
                                    <button
                                        key={option}
                                        onClick={() => setAnswers({ ...answers, [question.id]: option })}
                                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${answers[question.id] === option
                                                ? 'border-primary-500 bg-primary-50'
                                                : 'border-secondary-200 bg-white hover:border-primary-200'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${answers[question.id] === option
                                                    ? 'border-primary-500 bg-primary-500'
                                                    : 'border-secondary-300'
                                                }`}>
                                                {answers[question.id] === option && (
                                                    <CheckCircle size={16} className="text-white" />
                                                )}
                                            </div>
                                            <span className="font-medium text-secondary-900">{option}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {question.type === 'SHORT_ANSWER' && (
                            <input
                                type="text"
                                value={answers[question.id] || ''}
                                onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                                className="input w-full"
                                placeholder="Type your answer..."
                            />
                        )}
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between items-center">
                        <button
                            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                            disabled={currentQuestion === 0}
                            className="btn btn-secondary disabled:opacity-50"
                        >
                            Previous
                        </button>

                        {currentQuestion < quiz.questions.length - 1 ? (
                            <button
                                onClick={() => setCurrentQuestion(currentQuestion + 1)}
                                className="btn btn-primary"
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={submitted}
                                className="btn btn-success"
                            >
                                {submitted ? 'Submitting...' : 'Submit Quiz'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
