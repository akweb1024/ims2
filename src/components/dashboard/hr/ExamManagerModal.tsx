'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, HelpCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Question {
    question: string;
    options: string[];
    correctOption: number;
}

interface ExamForm {
    timeLimit: number;
    passPercentage: number;
    questions: Question[];
}

interface ExamManagerModalProps {
    jobId: string;
    jobTitle: string;
    onClose: () => void;
}

export default function ExamManagerModal({ jobId, jobTitle, onClose }: ExamManagerModalProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<ExamForm>({
        timeLimit: 30,
        passPercentage: 75,
        questions: []
    });

    useEffect(() => {
        const fetchExam = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`/api/recruitment/jobs/${jobId}/exam`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data) {
                        setFormData({
                            timeLimit: data.timeLimit,
                            passPercentage: data.passPercentage,
                            questions: (data.questions as any[]) || []
                        });
                    }
                }
            } catch (err) {
                console.error(err);
                toast.error('Failed to load exam details');
            } finally {
                setLoading(false);
            }
        };
        fetchExam();
    }, [jobId]);

    const handleSave = async () => {
        if (formData.questions.length === 0) {
            toast.error('Please add at least one question');
            return;
        }

        // Validate
        for (let i = 0; i < formData.questions.length; i++) {
            const q = formData.questions[i];
            if (!q.question.trim()) {
                toast.error(`Question ${i + 1} is empty`);
                return;
            }
            if (q.options.some(opt => !opt.trim())) {
                toast.error(`All options for Question ${i + 1} must be filled`);
                return;
            }
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/recruitment/jobs/${jobId}/exam`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success('Exam saved successfully');
                onClose();
            } else {
                toast.error('Failed to save exam');
            }
        } catch (err) {
            console.error(err);
            toast.error('An error occurred');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this exam? This action cannot be undone.')) return;

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/recruitment/jobs/${jobId}/exam`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                toast.success('Exam deleted');
                onClose();
            } else {
                toast.error('Failed to delete');
            }
        } catch (err) {
            toast.error('Error deleting exam');
        } finally {
            setSaving(false);
        }
    };

    const addQuestion = () => {
        setFormData(prev => ({
            ...prev,
            questions: [...prev.questions, { question: '', options: ['', '', '', ''], correctOption: 0 }]
        }));
    };

    const updateQuestion = (index: number, field: string, value: any) => {
        const newQs = [...formData.questions];
        (newQs[index] as any)[field] = value;
        setFormData({ ...formData, questions: newQs });
    };

    const updateOption = (qIndex: number, oIndex: number, value: string) => {
        const newQs = [...formData.questions];
        newQs[qIndex].options[oIndex] = value;
        setFormData({ ...formData, questions: newQs });
    };

    if (loading) return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl animate-pulse">Loading Exam Data...</div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Entrance Exam Configuration</h3>
                        <p className="text-gray-500 text-sm font-medium">For Position: <span className="text-primary-600">{jobTitle}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} className="text-gray-500" /></button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50/30">

                    {/* Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Time Limit (Minutes)</label>
                            <input
                                type="number"
                                min="10"
                                value={formData.timeLimit}
                                onChange={e => setFormData({ ...formData, timeLimit: parseInt(e.target.value) })}
                                className="w-full bg-gray-50 border-none rounded-xl p-3 font-bold focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pass Percentage (%)</label>
                            <input
                                type="number"
                                min="1" max="100"
                                value={formData.passPercentage}
                                onChange={e => setFormData({ ...formData, passPercentage: parseInt(e.target.value) })}
                                className="w-full bg-gray-50 border-none rounded-xl p-3 font-bold focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>

                    {/* Questions */}
                    <div className="space-y-6">
                        <div className="flex justify-between items-center px-2">
                            <h4 className="font-black text-gray-900 uppercase tracking-widest text-xs flex items-center gap-2">
                                <HelpCircle size={16} className="text-primary-600" /> Questions ({formData.questions.length})
                            </h4>
                            <button onClick={addQuestion} className="text-primary-600 font-bold uppercase text-[10px] tracking-widest hover:underline flex items-center gap-1">
                                <Plus size={14} /> Add New Question
                            </button>
                        </div>

                        {formData.questions.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
                                <AlertCircle className="mx-auto mb-2 opacity-50" size={32} />
                                <p className="font-bold text-sm">No questions added yet.</p>
                                <p className="text-xs mt-1">Click &quot;Add New Question&quot; to start building the exam.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {formData.questions.map((q, qIdx) => (
                                    <div key={qIdx} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative group transition-all hover:border-primary-200 hover:shadow-md">
                                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => {
                                                const newQs = formData.questions.filter((_, i) => i !== qIdx);
                                                setFormData({ ...formData, questions: newQs });
                                            }} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg" title="Delete Question">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        <div className="space-y-4 pr-12">
                                            <div className="flex gap-4 items-start">
                                                <span className="text-xl font-black text-gray-200 select-none">{String(qIdx + 1).padStart(2, '0')}</span>
                                                <div className="flex-1 space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase">Question Text</label>
                                                    <textarea
                                                        value={q.question}
                                                        onChange={e => updateQuestion(qIdx, 'question', e.target.value)}
                                                        className="w-full bg-gray-50 border-none rounded-xl p-3 font-semibold focus:ring-2 focus:ring-primary-500 min-h-[80px]"
                                                        placeholder="Enter the question here..."
                                                    />
                                                </div>
                                            </div>

                                            <div className="pl-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {q.options.map((opt, oIdx) => (
                                                    <div key={oIdx} className={`flex items-center gap-3 p-2 rounded-xl border transition-colors ${q.correctOption === oIdx ? 'border-success-200 bg-success-50' : 'border-transparent bg-gray-50'}`}>
                                                        <input
                                                            type="radio"
                                                            name={`q-${qIdx}-correct`}
                                                            checked={q.correctOption === oIdx}
                                                            onChange={() => updateQuestion(qIdx, 'correctOption', oIdx)}
                                                            className="w-4 h-4 text-success-600 focus:ring-success-500 cursor-pointer"
                                                            title="Mark as correct answer"
                                                        />
                                                        <input
                                                            value={opt}
                                                            onChange={e => updateOption(qIdx, oIdx, e.target.value)}
                                                            className="flex-1 bg-transparent border-none text-sm font-medium focus:ring-0 placeholder:text-gray-300"
                                                            placeholder={`Option ${oIdx + 1}`}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <button onClick={handleDelete} className="text-red-500 font-bold uppercase text-[10px] tracking-widest hover:text-red-700 px-4">
                        Delete Exam
                    </button>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="text-gray-500 font-bold uppercase text-[10px] tracking-widest hover:text-gray-900 px-4">
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary-200 disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? 'Saving...' : <><Save size={16} /> Save Configuration</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
