'use client';

import { useState, useEffect } from 'react';
import { FileText, Send, Plus, Eye, CheckCircle, Download, Copy } from 'lucide-react';
import { HR_PRESETS } from '@/lib/hr-presets';

export default function DocumentManager({ employees }: { employees: any[] }) {
    const [templates, setTemplates] = useState<any[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newTemplate, setNewTemplate] = useState({ title: '', type: 'OFFER_LETTER', content: '' });

    // Issuing
    const [mode, setMode] = useState<'SINGLE' | 'BULK'>('SINGLE');
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [bulkTarget, setBulkTarget] = useState('ALL'); // ALL, DEPT (simplified for now)

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/hr/documents/templates', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setTemplates(await res.json());
    };

    const saveTemplate = async () => {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/hr/documents/templates', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(newTemplate)
        });
        if (res.ok) {
            setIsCreating(false);
            fetchTemplates();
            setNewTemplate({ title: '', type: 'OFFER_LETTER', content: '' });
        }
    };

    const loadPreset = (preset: any) => {
        setNewTemplate({
            title: preset.title,
            type: preset.type,
            content: preset.content
        });
        setIsCreating(true);
    };

    const issueDocument = async () => {
        if (!selectedTemplate) return;
        if (mode === 'SINGLE' && !selectedEmployee) return;

        const token = localStorage.getItem('token');
        let endpoint = '/api/hr/documents/issue';
        const body: any = { templateId: selectedTemplate };

        if (mode === 'SINGLE') {
            body.employeeId = selectedEmployee;
        } else {
            endpoint = '/api/hr/documents/issue-bulk';
            body.filters = { all: true }; // Simplified for MVP
            // TODO: If we added Dept selector, we would pass departmentId here
        }

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            const data = await res.json();
            alert(mode === 'SINGLE' ? 'Document Issued Successfully!' : `Issued to ${data.total} employees!`);
            setSelectedTemplate('');
            setSelectedEmployee('');
        } else {
            alert('Failed to issue document');
        }
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* TEMPLATE MANAGER */}
                <div className="card-premium p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-xl font-bold">Document Templates</h3>
                            <p className="text-xs text-secondary-500">Manage formal document structures</p>
                        </div>
                        <button onClick={() => setIsCreating(!isCreating)} className="btn btn-sm btn-outline flex items-center gap-2">
                            {isCreating ? 'Cancel' : <><Plus size={16} /> New Template</>}
                        </button>
                    </div>

                    {!isCreating && (
                        <div className="mb-6 p-4 bg-primary-50 rounded-xl border border-primary-100">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h4 className="font-bold text-primary-800">🚀 Quick Start Presets</h4>
                                    <p className="text-[10px] text-primary-600">Select a standard preset to create a new template</p>
                                </div>
                                {templates.length > 0 && <span className="badge badge-primary">{templates.length} Active Templates</span>}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {HR_PRESETS.map((p, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => loadPreset(p)}
                                        className="text-left p-2 rounded-lg bg-white border border-primary-200 hover:bg-primary-100 transition-colors text-[10px] font-bold text-primary-700 flex items-center gap-2"
                                    >
                                        <Copy size={12} /> {p.title}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {isCreating ? (
                        <div className="space-y-4 bg-secondary-50 p-6 rounded-2xl border-2 border-primary-100">
                            <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-secondary-100 mb-4">
                                <span className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">New template configuration</span>
                                <div className="flex gap-2">
                                    <select
                                        className="select select-xs bg-secondary-50 font-bold border-none"
                                        onChange={(e) => {
                                            const preset = HR_PRESETS.find(p => p.title === e.target.value);
                                            if (preset) loadPreset(preset);
                                        }}
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Load from Preset...</option>
                                        {HR_PRESETS.map((p, idx) => <option key={idx} value={p.title}>{p.title}</option>)}
                                    </select>
                                </div>
                            </div>
                            <input
                                className="input w-full"
                                placeholder="Template Title"
                                value={newTemplate.title}
                                onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                            />
                            <select
                                className="input w-full"
                                value={newTemplate.type}
                                onChange={(e) => setNewTemplate({ ...newTemplate, type: e.target.value })}
                            >
                                <option value="OFFER_LETTER">Offer Letter</option>
                                <option value="CONTRACT">Appointment Letter / Contract</option>
                                <option value="NDA">Non-Disclosure Agreement (NDA)</option>
                                <option value="RELIEVING_LETTER">Relieving Letter</option>
                                <option value="NOC">No Objection Certificate (NOC)</option>
                                <option value="POLICY">Policy Acknowledgement</option>
                            </select>
                            <div className="relative">
                                <span className="absolute right-2 top-2 text-[10px] bg-secondary-200 px-2 py-1 rounded text-secondary-600">HTML Supported</span>
                                <textarea
                                    className="input w-full h-40 font-mono text-xs"
                                    placeholder="HTML Content. Use {{name}}, {{role}}, {{salary}}, {{date}}"
                                    value={newTemplate.content}
                                    onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-2 text-[10px] text-secondary-400 font-mono flex-wrap">
                                <span className="p-1 bg-white border rounded">{'{{name}}'}</span>
                                <span className="p-1 bg-white border rounded">{'{{designation}}'}</span>
                                <span className="p-1 bg-white border rounded">{'{{salary}}'}</span>
                                <span className="p-1 bg-white border rounded">{'{{joiningDate}}'}</span>
                                <span className="p-1 bg-white border rounded">{'{{employeeId}}'}</span>
                                <span className="p-1 bg-white border rounded">{'{{companyName}}'}</span>
                                <span className="p-1 bg-white border rounded">{'{{address}}'}</span>
                                <span className="p-1 bg-white border rounded">{'{{phone}}'}</span>
                                <span className="p-1 bg-white border rounded">{'{{panNumber}}'}</span>
                                <span className="p-1 bg-white border rounded">{'{{date}}'}</span>
                            </div>
                            <button onClick={saveTemplate} className="btn btn-primary w-full">Save Template</button>
                        </div>
                    ) : (
                        <div className="space-y-2 h-[300px] overflow-y-auto pr-2">
                            {templates.map(t => (
                                <div key={t.id} className="p-3 border rounded-lg hover:bg-secondary-50 cursor-pointer transition-colors flex justify-between items-center group">
                                    <div>
                                        <p className="font-bold text-sm">{t.title}</p>
                                        <span className="text-[10px] bg-secondary-200 px-2 rounded-full">{t.type}</span>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 flex gap-2">
                                        <button className="text-secondary-400 hover:text-primary-600"><Eye size={14} /></button> {/* Preview TODO */}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ISSUANCE PANEL */}
                <div className="card-premium p-6 bg-gradient-to-br from-white to-primary-50">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Send size={20} className="text-primary-600" /> Issue Document
                        </h3>
                        <div className="flex bg-secondary-100/50 p-1 rounded-lg">
                            <button
                                onClick={() => setMode('SINGLE')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${mode === 'SINGLE' ? 'bg-white shadow text-primary-600' : 'text-secondary-500'}`}
                            >
                                Single
                            </button>
                            <button
                                onClick={() => setMode('BULK')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${mode === 'BULK' ? 'bg-white shadow text-primary-600' : 'text-secondary-500'}`}
                            >
                                Bulk
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="label">Select Template</label>
                            <select
                                className="input w-full bg-white"
                                value={selectedTemplate}
                                onChange={(e) => setSelectedTemplate(e.target.value)}
                            >
                                <option value="">-- Choose Document --</option>
                                {templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                            </select>
                        </div>

                        {mode === 'SINGLE' ? (
                            <div>
                                <label className="label">Select Employee</label>
                                <select
                                    className="input w-full bg-white"
                                    value={selectedEmployee}
                                    onChange={(e) => setSelectedEmployee(e.target.value)}
                                >
                                    <option value="">-- Choose Employee --</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.user.email} ({e.designation})</option>)}
                                </select>
                            </div>
                        ) : (
                            <div className="p-4 bg-primary-50 border border-primary-200 rounded-xl">
                                <label className="label text-primary-800">Target Audience</label>
                                <div className="flex gap-4 mt-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" checked={bulkTarget === 'ALL'} onChange={() => setBulkTarget('ALL')} className="radio radio-primary radio-sm" />
                                        <span className="text-sm font-bold">All Employees</span>
                                    </label>
                                    {/* Placeholder for future Dept filter */}
                                    {/* <label className="flex items-center gap-2 opacity-50 cursor-not-allowed">
                                         <input type="radio" disabled className="radio radio-primary radio-sm" />
                                         <span className="text-sm">By Department (Pro)</span>
                                     </label> */}
                                </div>
                                <p className="text-[10px] mt-2 text-primary-600">
                                    This will issue the selected document to <strong>{employees.length}</strong> active employees.
                                </p>
                            </div>
                        )}

                        <div className="p-4 bg-white/50 rounded-xl text-xs text-secondary-500 border border-primary-100">
                            <p className="font-bold mb-1">ℹ️ What happens next?</p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li>The system will hydrate the template with employee data (Name, Role, Salary).</li>
                                <li>A digital copy will be generated in their portal.</li>
                                <li>They will be prompted to digitally sign it.</li>
                            </ul>
                        </div>

                        <button
                            onClick={issueDocument}
                            disabled={!selectedTemplate || (mode === 'SINGLE' && !selectedEmployee)}
                            className="btn btn-primary w-full py-3 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Generate & Issue Document
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
