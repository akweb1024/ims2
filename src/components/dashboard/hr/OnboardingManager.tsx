'use client';

import { useState } from 'react';
import { useOnboardingModules, useOnboardingMutations, useDepartments } from '@/hooks/useHR';
import { Plus, Trash2, Edit2, BookOpen, HelpCircle, Save, X, MoveUp, MoveDown } from 'lucide-react';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

export default function OnboardingManager() {
    const { data: modules, isLoading } = useOnboardingModules();
    const { data: departments } = useDepartments();
    const { createModule, updateModule, deleteModule } = useOnboardingMutations();

    const [editingModule, setEditingModule] = useState<any>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState<any>({
        title: '',
        type: 'COMPANY',
        description: '',
        content: '',
        departmentId: '',
        questions: [{ question: '', options: ['', '', '', ''], correctAnswer: 0 }]
    });

    const handleSave = async () => {
        try {
            if (editingModule) {
                await updateModule.mutateAsync({ id: editingModule.id, ...formData });
            } else {
                await createModule.mutateAsync(formData);
            }
            resetForm();
        } catch (err) {
            alert('Failed to save module');
        }
    };

    const resetForm = () => {
        setEditingModule(null);
        setIsCreating(false);
        setFormData({
            title: '',
            type: 'COMPANY',
            description: '',
            content: '',
            departmentId: '',
            questions: [{ question: '', options: ['', '', '', ''], correctAnswer: 0 }]
        });
    };

    const addQuestion = () => {
        setFormData({
            ...formData,
            questions: [...formData.questions, { question: '', options: ['', '', '', ''], correctAnswer: 0 }]
        });
    };

    const removeQuestion = (index: number) => {
        setFormData((prev: any) => ({
            ...prev,
            questions: prev.questions.filter((_: any, i: number) => i !== index)
        }));
    };

    if (isLoading) return <div className="p-10 text-center font-bold text-secondary-400">Loading modules...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] border border-secondary-100 shadow-sm">
                <div>
                    <h3 className="text-2xl font-black text-secondary-900 tracking-tight">Onboarding Workflows</h3>
                    <p className="text-secondary-500 text-sm font-medium">Create and manage study material and quizzes for new hires.</p>
                </div>
                {!isCreating && !editingModule && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="btn bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-primary-100 transition-all font-bold uppercase tracking-widest text-[10px]"
                    >
                        <Plus size={16} /> Create New Module
                    </button>
                )}
            </div>

            {(isCreating || editingModule) && (
                <div className="card-premium p-8 border-2 border-primary-100 bg-primary-50/5 overflow-hidden">
                    <div className="flex justify-between items-center mb-8">
                        <h4 className="font-black text-secondary-900 uppercase tracking-widest text-xs flex items-center gap-2">
                            <BookOpen className="text-primary-600" size={18} />
                            {editingModule ? 'Edit Module' : 'Configure New Module'}
                        </h4>
                        <button onClick={resetForm} className="text-secondary-400 hover:text-secondary-620">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="label-text text-[10px] font-black text-secondary-400 uppercase tracking-widest">Module Title</label>
                                <input
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="input w-full bg-white border-secondary-200 focus:ring-primary-500 font-bold"
                                    placeholder="e.g. Company Culture & Values"
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="label-text text-[10px] font-black text-secondary-400 uppercase tracking-widest">Module Type</label>
                                <select
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value, departmentId: e.target.value === 'DEPARTMENT' ? formData.departmentId : null })}
                                    className="select w-full bg-white border-secondary-200 focus:ring-primary-500 font-bold"
                                >
                                    <option value="COMPANY">Company-wide</option>
                                    <option value="DEPARTMENT">Department Specific</option>
                                    <option value="ROLE">Role Specific</option>
                                </select>
                            </div>
                        </div>

                        {formData.type === 'DEPARTMENT' && (
                            <div className="space-y-4">
                                <label className="label-text text-[10px] font-black text-secondary-400 uppercase tracking-widest">Target Department</label>
                                <select
                                    value={formData.departmentId || ''}
                                    onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                                    className="select w-full bg-white border-secondary-200 focus:ring-primary-500 font-bold"
                                >
                                    <option value="">Select Department</option>
                                    {departments?.map((d: any) => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="space-y-4">
                            <label className="label-text text-[10px] font-black text-secondary-400 uppercase tracking-widest">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="input w-full h-20 py-3 bg-white border-secondary-200 focus:ring-primary-500 font-bold"
                                placeholder="Brief overview of what the module covers..."
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="label-text text-[10px] font-black text-secondary-400 uppercase tracking-widest">Study Material (Markdown Support)</label>
                            <div className="h-96 pb-12">
                                <ReactQuill
                                    theme="snow"
                                    value={formData.content}
                                    onChange={(value: string) => setFormData({ ...formData, content: value })}
                                    className="h-full bg-white font-mono text-sm leading-relaxed"
                                    placeholder="Write your onboarding content here..."
                                    modules={{
                                        toolbar: [
                                            [{ 'header': [1, 2, 3, false] }],
                                            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                                            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                            ['link', 'image'],
                                            ['clean']
                                        ],
                                    }}
                                />
                            </div>
                        </div>

                        <div className="space-y-6 pt-8 border-t border-secondary-100">
                            <div className="flex justify-between items-center">
                                <h5 className="font-black text-secondary-900 uppercase tracking-widest text-[10px] flex items-center gap-2">
                                    <HelpCircle className="text-secondary-400" size={16} /> Quiz Questions
                                </h5>
                                <button
                                    onClick={addQuestion}
                                    className="text-primary-600 font-bold text-[10px] uppercase tracking-widest hover:underline"
                                >
                                    + Add Question
                                </button>
                            </div>

                            {formData.questions.map((q: any, qIdx: number) => (
                                <div key={qIdx} className="p-6 bg-white rounded-2xl border border-secondary-100 space-y-4 relative group">
                                    <button
                                        onClick={() => removeQuestion(qIdx)}
                                        className="absolute top-4 right-4 text-secondary-300 hover:text-danger-500 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-secondary-400 uppercase">Question {qIdx + 1}</label>
                                        <input
                                            value={q.question}
                                            onChange={e => {
                                                const newQs = [...formData.questions];
                                                newQs[qIdx].question = e.target.value;
                                                setFormData({ ...formData, questions: newQs });
                                            }}
                                            className="input w-full bg-secondary-50 border-none font-bold"
                                            placeholder="The question text..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {q.options.map((opt: string, oIdx: number) => (
                                            <div key={oIdx} className="flex items-center gap-3">
                                                <input
                                                    type="radio"
                                                    checked={q.correctAnswer === oIdx}
                                                    onChange={() => {
                                                        const newQs = [...formData.questions];
                                                        newQs[qIdx].correctAnswer = oIdx;
                                                        setFormData({ ...formData, questions: newQs });
                                                    }}
                                                    className="radio radio-primary radio-xs"
                                                />
                                                <input
                                                    value={opt}
                                                    onChange={e => {
                                                        const newQs = [...formData.questions];
                                                        newQs[qIdx].options[oIdx] = e.target.value;
                                                        setFormData({ ...formData, questions: newQs });
                                                    }}
                                                    className="input input-sm flex-1 bg-secondary-50/50 border-none text-xs font-medium"
                                                    placeholder={`Option ${oIdx + 1}`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end gap-4 pt-8">
                            <button onClick={resetForm} className="btn bg-secondary-100 text-secondary-600 px-8 rounded-xl font-bold uppercase text-[10px] tracking-widest">Cancel</button>
                            <button onClick={handleSave} className="btn bg-primary-600 text-white px-10 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-primary-100 flex items-center gap-2">
                                <Save size={16} /> {editingModule ? 'Update Module' : 'Create Module'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                {modules?.map((module: any) => (
                    <div key={module.id} className="card-premium p-6 group hover:border-primary-200 transition-all flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-3 rounded-2xl ${module.type === 'COMPANY' ? 'bg-indigo-50 text-indigo-600' : module.type === 'DEPARTMENT' ? 'bg-orange-50 text-orange-600' : 'bg-success-50 text-success-600'}`}>
                                    <BookOpen size={20} />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setEditingModule(module);
                                            setFormData({
                                                title: module.title,
                                                type: module.type,
                                                description: module.description,
                                                content: module.content,
                                                departmentId: module.departmentId,
                                                questions: module.questions
                                            });
                                        }}
                                        className="p-2 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        onClick={() => { if (confirm('Delete this module?')) deleteModule.mutate(module.id); }}
                                        className="p-2 text-secondary-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            <h4 className="text-lg font-black text-secondary-900 tracking-tight">{module.title}</h4>
                            <p className="text-xs text-secondary-400 font-bold uppercase tracking-widest mt-1">
                                {module.type} {module.department?.name ? `• ${module.department.name}` : ''}
                            </p>
                            <p className="text-secondary-500 text-sm mt-4 line-clamp-3 leading-relaxed">
                                {module.description}
                            </p>
                        </div>
                        <div className="mt-8 pt-6 border-t border-secondary-50 flex justify-between items-center">
                            <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">{module.questions.length} Questions</span>
                            <div className="flex gap-1">
                                <button className="p-1 text-secondary-300 hover:text-secondary-900"><MoveUp size={14} /></button>
                                <button className="p-1 text-secondary-300 hover:text-secondary-900"><MoveDown size={14} /></button>
                            </div>
                        </div>
                    </div>
                ))}

                {modules?.length === 0 && !isCreating && (
                    <div className="col-span-full py-20 bg-secondary-50/50 rounded-[2.5rem] border-4 border-dashed border-secondary-100 flex flex-col items-center text-center">
                        <BookOpen size={48} className="text-secondary-200 mb-4" />
                        <h4 className="text-xl font-black text-secondary-900 tracking-tight">No onboarding modules yet.</h4>
                        <p className="text-secondary-500 max-w-xs mt-2 font-medium">Start building your company&apos;s knowledge base for new hires.</p>
                        <button onClick={() => setIsCreating(true)} className="mt-6 text-primary-600 font-bold uppercase tracking-widest text-[10px] hover:underline">+ New Module</button>
                    </div>
                )}
            </div>
        </div>
    );
}
