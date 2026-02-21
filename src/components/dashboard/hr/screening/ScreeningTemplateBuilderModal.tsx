import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Wand2, ArrowRight, Settings } from 'lucide-react';
import { fetchJson } from '@/lib/api-utils';
import { toast } from 'react-hot-toast';

interface TemplateProps {
    template?: any;
    onClose: () => void;
    onSaved: () => void;
}

export default function ScreeningTemplateBuilderModal({ template, onClose, onSaved }: TemplateProps) {
    const [title, setTitle] = useState(template?.title || '');
    const [department, setDepartment] = useState(template?.department || '');
    const [jobType, setJobType] = useState(template?.jobType || 'Full-Time');
    const [categories, setCategories] = useState<string[]>(template?.categories || ['General', 'Technical', 'Culture Fit']);
    
    // Default 1 manual question
    const [questions, setQuestions] = useState<any[]>(
        template?.questions || [{ id: 'q1', category: 'General', question: '', difficulty: 'Medium', rubric: [], followups: [], required: true }]
    );
    
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);

    // AI Prompts inputs
    const [jobDescription, setJobDescription] = useState('');
    const [candidateSkills, setCandidateSkills] = useState('');
    const [roundType, setRoundType] = useState('Technical Round');

    const handleAddCategory = () => {
        const cat = prompt('Enter Category Name:');
        if (cat && !categories.includes(cat)) {
            setCategories([...categories, cat]);
        }
    };

    const handleAddQuestion = () => {
        setQuestions([
            ...questions,
            { id: `q${Date.now()}`, category: categories[0] || 'General', question: '', difficulty: 'Medium', rubric: [], followups: [], required: true }
        ]);
    };

    const handleRemoveQuestion = (id: string) => {
        setQuestions(questions.filter(q => q.id !== id));
    };

    const updateQuestion = (id: string, field: string, value: any) => {
        setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    const generateAIQuestions = async () => {
        if (!jobDescription) {
            toast.error('Please provide a job description for context');
            return;
        }
        setGenerating(true);
        try {
            const res = await fetchJson('/api/ai/generate-questions', 'POST', {
                jobDescription,
                candidateSkills,
                roundType,
                numQuestions: 5,
                categories
            });
            if (res && Array.isArray(res)) {
                // merge with existing
                setQuestions([...questions, ...res.map((r, i) => ({ ...r, id: `ai-${Date.now()}-${i}` }))]);
                toast.success('Generated AI questions successfully!');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to generate AI questions');
        } finally {
            setGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error('Template title is required');
            return;
        }
        setSaving(true);
        try {
            const method = template ? 'PUT' : 'POST';
            const url = template ? `/api/recruitment/templates/${template.id}` : '/api/recruitment/templates';
            
            await fetchJson(url, method, {
                title,
                department,
                jobType,
                categories,
                questions,
                weights: {} // Optional implementation
            });
            
            toast.success('Template saved successfully');
            onSaved();
        } catch (error) {
            console.error(error);
            toast.error('Failed to save template');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                            <Settings className="h-6 w-6 text-primary-500" />
                            {template ? 'Edit Screening Template' : 'New Screening Template'}
                        </h3>
                        <p className="text-sm font-medium text-gray-500 mt-1">Design scorecards, rubrics, and automated evaluations.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 flex flex-col md:flex-row gap-8 bg-gray-50/20 scrollbar-thin scrollbar-thumb-gray-200">
                    {/* Left Panel: Settings */}
                    <div className="w-full md:w-1/3 space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Basic Details</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-600 block mb-1">Title</label>
                                    <input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-gray-50 border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all" placeholder="e.g. Senior Frontend Engineer" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-600 block mb-1">Department</label>
                                        <input value={department} onChange={e => setDepartment(e.target.value)} className="w-full bg-gray-50 border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="e.g. Engineering" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-600 block mb-1">Job Type</label>
                                        <select value={jobType} onChange={e => setJobType(e.target.value)} className="w-full bg-gray-50 border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                                            <option>Full-Time</option>
                                            <option>Contract</option>
                                            <option>Internship</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">AI Co-Pilot</h4>
                                <Wand2 className="h-4 w-4 text-purple-500" />
                            </div>
                            <p className="text-xs text-gray-500 font-medium mb-4">Auto-generate customized questions using AI based on context.</p>
                            <div className="space-y-4">
                                <textarea value={jobDescription} onChange={e => setJobDescription(e.target.value)} className="w-full h-24 bg-purple-50/30 border-purple-100 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none resize-none" placeholder="Paste job description or requirements here..." />
                                <input value={candidateSkills} onChange={e => setCandidateSkills(e.target.value)} className="w-full bg-purple-50/30 border-purple-100 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Key skills (e.g. React, Node.js)" />
                                <button
                                    onClick={generateAIQuestions}
                                    disabled={generating || !jobDescription}
                                    className="w-full bg-purple-100 text-purple-700 hover:bg-purple-200 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                                >
                                    {generating ? 'Generating...' : <><Wand2 size={14} /> Generate List</>}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Questions Builder */}
                    <div className="w-full md:w-2/3 space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full min-h-[500px]">
                            <div className="flex justify-between items-end mb-6">
                                <div>
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Evaluation Criteria</h4>
                                    <div className="flex gap-2 flex-wrap mt-2">
                                        {categories.map(c => (
                                            <span key={c} className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide">{c}</span>
                                        ))}
                                        <button onClick={handleAddCategory} className="bg-white border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide transition-all">+ Add</button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                                {questions.map((q, idx) => (
                                    <div key={q.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 gap-4 flex flex-col group relative hover:border-primary-200 transition-all">
                                        <button onClick={() => handleRemoveQuestion(q.id)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 size={16} />
                                        </button>
                                        
                                        <div className="flex gap-3 items-start">
                                            <span className="bg-white h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm border border-gray-100 shrink-0 text-gray-500 mt-1">{idx + 1}</span>
                                            <div className="flex-1 space-y-3">
                                                <input
                                                    value={q.question}
                                                    onChange={e => updateQuestion(q.id, 'question', e.target.value)}
                                                    className="w-full bg-transparent font-bold text-gray-900 border-none p-0 focus:ring-0 outline-none text-base"
                                                    placeholder="Enter your question..."
                                                />
                                                <div className="flex gap-3">
                                                    <select
                                                        value={q.category}
                                                        onChange={e => updateQuestion(q.id, 'category', e.target.value)}
                                                        className="bg-white text-xs font-medium rounded-lg px-2 py-1 border-gray-200 focus:ring-1 focus:ring-primary-500"
                                                    >
                                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                    <select
                                                        value={q.difficulty}
                                                        onChange={e => updateQuestion(q.id, 'difficulty', e.target.value)}
                                                        className={`bg-white text-xs font-medium rounded-lg px-2 py-1 focus:ring-1 focus:ring-primary-500 ${
                                                            q.difficulty === 'Easy' ? 'text-green-600 border-green-200' :
                                                            q.difficulty === 'Medium' ? 'text-amber-600 border-amber-200' :
                                                            'text-red-600 border-red-200'
                                                        }`}
                                                    >
                                                        <option value="Easy">Easy</option>
                                                        <option value="Medium">Medium</option>
                                                        <option value="Hard">Hard</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Expected Answer / Rubric (comma separated)</label>
                                                    <input
                                                        value={(q.rubric || []).join(', ')}
                                                        onChange={e => updateQuestion(q.id, 'rubric', e.target.value.split(',').map(s => s.trim()))}
                                                        className="w-full bg-white border-gray-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary-500 outline-none"
                                                        placeholder="e.g. Clears states correctly, Explains hooks"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button onClick={handleAddQuestion} className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-4 text-sm font-bold text-gray-500 hover:text-primary-600 hover:border-primary-200 hover:bg-primary-50/50 flex flex-col items-center justify-center gap-2 transition-all group">
                                    <div className="h-8 w-8 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                        <Plus size={16} />
                                    </div>
                                    Add Question Manually
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-6 py-3 text-gray-500 font-bold uppercase text-[10px] tracking-widest hover:text-gray-900">Cancel</button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary-200 disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95"
                    >
                        {saving ? 'Saving...' : 'Save Template'} <ArrowRight size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
