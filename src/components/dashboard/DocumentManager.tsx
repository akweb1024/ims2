'use client';

import { useState, useEffect } from 'react';
import { FileText, Send, Plus, Eye, CheckCircle } from 'lucide-react';

export default function DocumentManager({ employees }: { employees: any[] }) {
    const [templates, setTemplates] = useState<any[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newTemplate, setNewTemplate] = useState({ title: '', type: 'OFFER_LETTER', content: '' });

    // Issuing
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState('');

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

    const issueDocument = async () => {
        if (!selectedTemplate || !selectedEmployee) return;
        const token = localStorage.getItem('token');
        const res = await fetch('/api/hr/documents/issue', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ templateId: selectedTemplate, employeeId: selectedEmployee })
        });
        if (res.ok) {
            alert('Document Issued Successfully!');
            setSelectedTemplate('');
            setSelectedEmployee('');
        }
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* TEMPLATE MANAGER */}
                <div className="card-premium p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold">Document Templates</h3>
                        <button onClick={() => setIsCreating(!isCreating)} className="btn btn-sm btn-outline">
                            {isCreating ? 'Cancel' : '+ New Template'}
                        </button>
                    </div>

                    {isCreating ? (
                        <div className="space-y-4 bg-secondary-50 p-4 rounded-xl">
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
                                <option value="CONTRACT">Contract / Agreement</option>
                                <option value="NDA">NDA</option>
                                <option value="POLICY">Policy Ack</option>
                            </select>
                            <textarea
                                className="input w-full h-40 font-mono text-xs"
                                placeholder="HTML Content. Use {{name}}, {{role}}, {{salary}}, {{date}}"
                                value={newTemplate.content}
                                onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                            />
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
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Send size={20} className="text-primary-600" /> Issue Document
                    </h3>

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
                            disabled={!selectedTemplate || !selectedEmployee}
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
