import { useState, useEffect } from 'react';
import { X, Save, MessageSquare, CheckSquare, TriangleAlert, Flag, ThumbsUp, ThumbsDown } from 'lucide-react';
import { fetchJson } from '@/lib/api-utils';
import { toast } from 'react-hot-toast';

interface InterviewScorecardModalProps {
    interview: any;
    onClose: () => void;
}

export default function InterviewScorecardModal({ interview, onClose }: InterviewScorecardModalProps) {
    const [templates, setTemplates] = useState<any[]>([]);
    const [screening, setScreening] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    // Form fields
    const [responses, setResponses] = useState<Record<string, any>>({});
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [finalRecommendation, setFinalRecommendation] = useState('');
    const [finalNotes, setFinalNotes] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Check if screening exists
            const sRes = await fetchJson(`/api/recruitment/interviews/${interview.id}/screening`);
            if (sRes && !sRes.error) {
                setScreening(sRes);
                // Load existing responses into state
                const rMap: any = {};
                (sRes.responses || []).forEach((r: any) => {
                    rMap[r.questionId] = r;
                });
                setResponses(rMap);
            } else {
                // Fetch templates if no screening initialized
                const tRes = await fetchJson('/api/recruitment/templates');
                setTemplates(Array.isArray(tRes) ? tRes : []);
            }
        } catch (error) {
            console.log('Error loading data, assuming no screening yet');
            // Fetch templates
            const tRes = await fetchJson('/api/recruitment/templates').catch(() => []);
            setTemplates(Array.isArray(tRes) ? tRes : []);
        } finally {
            setLoading(false);
        }
    };

    const handleInitScreening = async () => {
        if (!selectedTemplateId) return toast.error('Select a template first');
        try {
            const res = await fetchJson(`/api/recruitment/interviews/${interview.id}/screening/init`, 'POST', {
                templateId: selectedTemplateId
            });
            if (res.id) {
                toast.success('Scorecard initialized');
                loadData();
            }
        } catch (error) {
            toast.error('Failed to initialize');
        }
    };

    const handleAnswerChange = async (questionId: string, field: string, value: any) => {
        // Optimistic UI update
        const prev = responses[questionId] ? { ...responses[questionId] } : {};
        const updated = { ...prev, [field]: value };
        setResponses(r => ({ ...r, [questionId]: updated }));

        // Auto-save
        try {
            await fetchJson(`/api/recruitment/interviews/${interview.id}/screening`, 'PATCH', {
                questionId, [field]: value
            });
        } catch (error) {
            console.error('Auto-save failed', error);
        }
    };

    const handleSubmit = async () => {
        if (!finalRecommendation) return toast.error('Select a final recommendation');
        setSubmitting(true);
        try {
            const res = await fetchJson(`/api/recruitment/interviews/${interview.id}/screening/submit`, 'POST', {
                recommendation: finalRecommendation,
                finalNotes
            });
            toast.success(`Screening submitted. Category Score: ${res.finalScore?.toFixed(1)}`);
            onClose();
        } catch (error) {
            toast.error('Failed to submit screening');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm">
                <div className="animate-spin h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex flex-col md:flex-row p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            {/* Modal Container */}
            <div className="bg-gray-50 flex flex-col w-full max-w-6xl h-full max-h-[90vh] mx-auto rounded-3xl shadow-2xl overflow-hidden mt-auto mb-auto">
                <div className="p-6 border-b border-gray-200 bg-white flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                            <CheckSquare className="h-6 w-6 text-primary-600" />
                            Interview Scorecard
                        </h2>
                        <p className="text-gray-500 font-medium text-sm">
                            Candidate: <span className="font-bold text-gray-800">{interview.application?.applicantName || 'Unknown'}</span> | 
                            Round: <span className="font-bold text-gray-800">{interview.level || 1}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {!screening ? (
                        <div className="p-12 max-w-lg mx-auto flex flex-col items-center justify-center text-center h-full">
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Start Evaluation</h3>
                            <p className="text-gray-500 mb-8">Select a screening template to load the appropriate questions and rubrics for this candidate.</p>
                            
                            <select 
                                value={selectedTemplateId} 
                                onChange={e => setSelectedTemplateId(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl p-4 mb-4 font-bold shadow-sm"
                            >
                                <option value="">-- Choose Template --</option>
                                {templates.map(t => <option key={t.id} value={t.id}>{t.title} (v{t.version})</option>)}
                            </select>

                            <button
                                onClick={handleInitScreening}
                                disabled={!selectedTemplateId}
                                className="bg-primary-600 hover:bg-primary-700 text-white w-full py-4 rounded-xl font-bold uppercase tracking-widest disabled:opacity-50"
                            >
                                Begin Interview
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col md:flex-row h-full">
                            {/* Questions Column */}
                            <div className="w-full md:w-2/3 border-r border-gray-200 bg-white overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200">
                                <h3 className="font-black text-gray-400 uppercase tracking-widest text-xs mb-8">Questions Outline</h3>
                                <div className="space-y-12">
                                    {(screening.template?.questions || []).map((q: any, i: number) => {
                                        const r = responses[q.id] || {};
                                        
                                        return (
                                            <div key={q.id} className="space-y-4 pb-8 border-b border-gray-100">
                                                <div className="flex gap-4">
                                                    <span className="text-2xl font-black text-gray-200 mt-1">
                                                        {(i + 1).toString().padStart(2, '0')}
                                                    </span>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h4 className="text-lg font-bold text-gray-900">{q.question}</h4>
                                                            <span className="text-[10px] font-bold px-2 py-1 bg-gray-100 text-gray-500 uppercase tracking-widest rounded-md">{q.category}</span>
                                                        </div>
                                                        
                                                        <div className="text-sm text-gray-500 bg-amber-50 border border-amber-100 p-3 rounded-xl mb-4">
                                                            <span className="font-bold text-amber-700 block mb-1">Look for:</span>
                                                            <ul className="list-disc list-inside">
                                                                {(q.rubric || []).map((rb: string, rbIndex: number) => (
                                                                    <li key={rbIndex}>{rb}</li>
                                                                ))}
                                                            </ul>
                                                        </div>

                                                        <div className="space-y-4 bg-gray-50 border border-gray-100 rounded-xl p-4">
                                                            <div>
                                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Rating (1-5)</label>
                                                                <div className="flex gap-2">
                                                                    {[1, 2, 3, 4, 5].map((val) => (
                                                                        <button 
                                                                            key={val}
                                                                            onClick={() => handleAnswerChange(q.id, 'rating', val)}
                                                                            className={`w-10 h-10 rounded-lg font-bold flex items-center justify-center transition-all ${r.rating === val ? 'bg-primary-500 text-white shadow-md' : 'bg-white border hover:bg-gray-100 text-gray-600'}`}
                                                                        >
                                                                            {val}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Checklist Flag</label>
                                                                    <select 
                                                                        value={r.checkboxStatus || ''} 
                                                                        onChange={e => handleAnswerChange(q.id, 'checkboxStatus', e.target.value)}
                                                                        className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm outline-none"
                                                                    >
                                                                        <option value="">None</option>
                                                                        <option value="EXCEEDS">Exceeds Expectation</option>
                                                                        <option value="MEETS">Meets Expectation</option>
                                                                        <option value="PARTIAL">Partial</option>
                                                                        <option value="NO">No / Fails</option>
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Signal Flag</label>
                                                                    <select 
                                                                        value={r.flags || ''} 
                                                                        onChange={e => handleAnswerChange(q.id, 'flags', e.target.value)}
                                                                        className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm outline-none"
                                                                    >
                                                                        <option value="">None</option>
                                                                        <option value="STRONG_SIGNAL">Strong Positive Signal</option>
                                                                        <option value="RED_FLAG">Red Flag 🚩</option>
                                                                    </select>
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Interviewer Notes</label>
                                                                <textarea 
                                                                    value={r.notes || ''}
                                                                    onChange={e => handleAnswerChange(q.id, 'notes', e.target.value)}
                                                                    placeholder="Type notes here... (autosaves)"
                                                                    className="w-full h-20 bg-white border border-gray-200 rounded-lg p-3 text-sm resize-none outline-none focus:border-primary-300"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Right Column: Finalize */}
                            <div className="w-full md:w-1/3 bg-gray-50 p-6 flex flex-col justify-end">
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                    <h3 className="font-black text-gray-900 mb-6 flex items-center gap-2">
                                        <Flag className="h-5 w-5 text-gray-400" />
                                        Final Assessment
                                    </h3>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Decision</label>
                                            <select
                                                value={finalRecommendation}
                                                onChange={e => setFinalRecommendation(e.target.value)}
                                                className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-bold shadow-sm"
                                            >
                                                <option value="">Choose Recommendation...</option>
                                                <option value="Strong Hire">Strong Hire</option>
                                                <option value="Hire">Hire</option>
                                                <option value="Lean Hire">Lean Hire</option>
                                                <option value="Lean No">Lean No</option>
                                                <option value="No Hire">No Hire</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Final Remarks</label>
                                            <textarea
                                                value={finalNotes}
                                                onChange={e => setFinalNotes(e.target.value)}
                                                className="w-full h-32 bg-white border border-gray-200 rounded-xl p-3 text-sm resize-none shadow-sm"
                                                placeholder="Summary of the candidate..."
                                            />
                                        </div>

                                        <button
                                            onClick={handleSubmit}
                                            disabled={submitting || screening.status === 'SUBMITTED'}
                                            className="bg-black hover:bg-gray-800 text-white w-full py-4 rounded-xl font-bold uppercase tracking-widest disabled:opacity-50 mt-4"
                                        >
                                            {submitting ? 'Submitting...' : screening.status === 'SUBMITTED' ? 'Scorecard Locked' : 'Submit Final Score'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
