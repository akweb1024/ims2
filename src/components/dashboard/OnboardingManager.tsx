'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash, BookOpen, Save, CheckSquare } from 'lucide-react';

export default function OnboardingManager() {
    const [modules, setModules] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newModule, setNewModule] = useState<any>({
        title: '',
        type: 'COMPANY',
        description: '',
        content: '',
        departmentId: '',
        requiredForDesignation: '',
        order: 1,
        questions: [{ question: '', options: ['', '', '', ''], correctAnswer: 0 }]
    });

    useEffect(() => {
        fetchModules();
        fetchDepartments();
    }, []);

    const fetchModules = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/hr/onboarding/modules', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setModules(await res.json());
    };

    const fetchDepartments = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/hr/departments', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setDepartments(await res.json());
    };

    // Form Handlers
    const handleQuestionAdd = () => {
        setNewModule({
            ...newModule,
            questions: [...newModule.questions, { question: '', options: ['', '', '', ''], correctAnswer: 0 }]
        });
    };

    const handleQuestionChange = (idx: number, field: string, value: any) => {
        const updated = [...newModule.questions];
        updated[idx] = { ...updated[idx], [field]: value };
        setNewModule({ ...newModule, questions: updated });
    };

    const handleOptionChange = (qIdx: number, oIdx: number, value: string) => {
        const updated = [...newModule.questions];
        updated[qIdx].options[oIdx] = value;
        setNewModule({ ...newModule, questions: updated });
    };

    const saveModule = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/hr/onboarding/modules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(newModule)
            });

            if (res.ok) {
                setIsCreating(false);
                fetchModules();
                // Reset form
                setNewModule({
                    title: '',
                    type: 'COMPANY',
                    description: '',
                    content: '',
                    departmentId: '',
                    requiredForDesignation: '',
                    order: modules.length + 1,
                    questions: [{ question: '', options: ['', '', '', ''], correctAnswer: 0 }]
                });
            } else {
                alert('Failed to save module');
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-secondary-900">Onboarding & Training Modules</h2>
                <button
                    onClick={() => setIsCreating(true)}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Plus size={16} /> New Module
                </button>
            </div>

            {isCreating && (
                <div className="card bg-secondary-50 p-6 border border-secondary-200">
                    <h3 className="text-lg font-bold mb-4">Create New Module</h3>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1">Title</label>
                            <input
                                type="text"
                                className="input w-full"
                                value={newModule.title}
                                onChange={(e) => setNewModule({ ...newModule, title: e.target.value })}
                                placeholder="e.g. Company Policy 101"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">Type</label>
                            <select
                                className="input w-full"
                                value={newModule.type}
                                onChange={(e) => setNewModule({ ...newModule, type: e.target.value })}
                            >
                                <option value="COMPANY">Company (All Employees)</option>
                                <option value="ROLE">Role Specific</option>
                                <option value="DEPARTMENT">Department Specific</option>
                            </select>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-semibold mb-1">Description</label>
                        <input
                            type="text"
                            className="input w-full"
                            value={newModule.description}
                            onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
                        />
                    </div>

                    {newModule.type === 'DEPARTMENT' && (
                        <div className="mb-4">
                            <label className="block text-sm font-semibold mb-1">Department</label>
                            <select
                                className="input w-full"
                                value={newModule.departmentId}
                                onChange={(e) => setNewModule({ ...newModule, departmentId: e.target.value })}
                            >
                                <option value="">Select Department</option>
                                {departments.map((d: any) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {newModule.type === 'ROLE' && (
                        <div className="mb-4">
                            <label className="block text-sm font-semibold mb-1">Designation</label>
                            <input
                                type="text"
                                className="input w-full"
                                placeholder="Match designation exactly (e.g. Senior Developer)"
                                value={newModule.requiredForDesignation}
                                onChange={(e) => setNewModule({ ...newModule, requiredForDesignation: e.target.value })}
                            />
                        </div>
                    )}

                    <div className="mb-4">
                        <label className="block text-sm font-semibold mb-1">Study Material (Content)</label>
                        <textarea
                            className="input w-full h-32"
                            placeholder="Enter the text content the employee must read before the test..."
                            value={newModule.content}
                            onChange={(e) => setNewModule({ ...newModule, content: e.target.value })}
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-semibold mb-2">Quiz Questions</label>
                        {newModule.questions.map((q: any, idx: number) => (
                            <div key={idx} className="bg-white p-4 rounded-xl border border-secondary-200 mb-2">
                                <div className="flex gap-2 mb-2">
                                    <span className="font-bold text-secondary-500">Q{idx + 1}</span>
                                    <input
                                        type="text"
                                        className="input flex-1"
                                        placeholder="Question text"
                                        value={q.question}
                                        onChange={(e) => handleQuestionChange(idx, 'question', e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2 ml-6">
                                    {q.options.map((opt: string, oIdx: number) => (
                                        <div key={oIdx} className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name={`correct-${idx}`}
                                                checked={q.correctAnswer === oIdx}
                                                onChange={() => handleQuestionChange(idx, 'correctAnswer', oIdx)}
                                            />
                                            <input
                                                type="text"
                                                className="input w-full text-sm py-1"
                                                placeholder={`Option ${oIdx + 1}`}
                                                value={opt}
                                                onChange={(e) => handleOptionChange(idx, oIdx, e.target.value)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <button onClick={handleQuestionAdd} className="text-primary-600 text-sm font-bold mt-2 hover:underline">+ Add Question</button>
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                        <button onClick={() => setIsCreating(false)} className="btn btn-ghost">Cancel</button>
                        <button onClick={saveModule} className="btn btn-primary flex items-center gap-2">
                            <Save size={16} /> Save Module
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.map((m: any) => (
                    <div key={m.id} className="card hover:shadow-lg transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded bg-secondary-100 text-secondary-600`}>{m.type}</span>
                                <h3 className="font-bold text-lg mt-2">{m.title}</h3>
                            </div>
                            <div className="flex gap-1 text-secondary-400">
                                <BookOpen size={16} />
                            </div>
                        </div>
                        <p className="text-secondary-500 text-sm mb-4 line-clamp-2">{m.description || 'No description'}</p>
                        <div className="flex items-center justify-between text-xs font-bold text-secondary-500">
                            <span>{m.questions?.length || 0} Questions</span>
                            <span>Order: {m.order}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
