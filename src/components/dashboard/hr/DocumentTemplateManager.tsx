'use client';

import { useState } from 'react';
import { useDocumentTemplates, useDocumentTemplateMutations, useEmployees, useDigitalDocumentMutations } from '@/hooks/useHR';
import { FileText, Plus, Trash2, Edit2, Save, X, Send, User } from 'lucide-react';
import { HR_PRESETS } from '@/lib/hr-presets';

export default function DocumentTemplateManager() {
    const { data: templates } = useDocumentTemplates();
    const { data: employees } = useEmployees();
    const { create, update, remove } = useDocumentTemplateMutations();
    const { generate } = useDigitalDocumentMutations();

    const [isEditing, setIsEditing] = useState(false);
    const [editingObj, setEditingObj] = useState<any>(null);
    const [formData, setFormData] = useState({ title: '', type: 'OFFER_LETTER', content: '' });

    const [isIssuing, setIsIssuing] = useState(false);
    const [issueData, setIssueData] = useState({ templateId: '', employeeId: '' });

    const handleSave = async () => {
        try {
            if (editingObj) {
                await update.mutateAsync({ id: editingObj.id, ...formData });
            } else {
                await create.mutateAsync(formData);
            }
            setIsEditing(false);
            setEditingObj(null);
            setFormData({ title: '', type: 'OFFER_LETTER', content: '' });
        } catch (err) {
            alert('Failed to save template');
        }
    };

    const handleIssue = async () => {
        try {
            await generate.mutateAsync(issueData);
            alert('Document generated and sent to employee portal!');
            setIsIssuing(false);
        } catch (err) {
            alert('Failed to issue document');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-secondary-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50 rounded-full -mr-32 -mt-32 opacity-50 blur-3xl"></div>
                <div className="relative z-10">
                    <h3 className="text-3xl font-black text-secondary-900 tracking-tight">Compliance Documents</h3>
                    <p className="text-secondary-500 font-medium">Manage legal templates and issue documents for e-signatures.</p>
                </div>
                <div className="flex gap-4 relative z-10">
                    <button
                        onClick={() => setIsIssuing(true)}
                        className="btn bg-secondary-900 text-white px-8 py-3 rounded-2xl flex items-center gap-2 shadow-lg transition-all font-bold uppercase tracking-[0.2em] text-[10px]"
                    >
                        <Send size={16} /> Issue Document
                    </button>
                    <button
                        onClick={() => { setIsEditing(true); setEditingObj(null); setFormData({ title: '', type: 'OFFER_LETTER', content: '' }); }}
                        className="btn bg-primary-600 text-white px-8 py-3 rounded-2xl flex items-center gap-2 shadow-lg transition-all font-bold uppercase tracking-[0.2em] text-[10px]"
                    >
                        <Plus size={16} /> Create Template
                    </button>
                </div>
            </div>

            {!isEditing && !isIssuing && (
                <div className="p-6 bg-primary-50 rounded-[2rem] border border-primary-100">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center font-black text-xl">🚀</div>
                        <div>
                            <h4 className="font-bold text-primary-900">Preset Templates</h4>
                            <p className="text-[10px] text-primary-600 uppercase font-black tracking-widest">Select a preset to quickly create a formal document definition</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {HR_PRESETS.map((p: any, idx: number) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    setFormData({ title: p.title, type: p.type, content: p.content.trim() });
                                    setIsEditing(true);
                                    setEditingObj(null);
                                }}
                                className="text-left p-3 rounded-xl bg-white border border-primary-200 hover:bg-primary-100 transition-all shadow-sm hover:shadow-md group flex flex-col justify-between h-24"
                            >
                                <span className="font-bold text-primary-700 text-xs leading-tight">{p.title}</span>
                                <div className="flex justify-between items-center">
                                    <span className="text-[8px] bg-primary-50 px-2 py-0.5 rounded uppercase font-black text-primary-400">{p.type}</span>
                                    <Plus size={12} className="text-primary-300 group-hover:text-primary-600" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {isEditing && (
                <div className="card-premium p-8 border-2 border-primary-100 bg-primary-50/5">
                    <div className="flex justify-between items-center mb-8">
                        <h4 className="font-black text-secondary-900 uppercase tracking-widest text-xs flex items-center gap-2">
                            <FileText className="text-primary-600" size={18} />
                            {editingObj ? 'Edit Template' : 'New Template Definition'}
                        </h4>
                        <button onClick={() => { setIsEditing(false); setEditingObj(null); }} className="text-secondary-400 hover:text-secondary-620">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Template Title</label>
                                <input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="input w-full bg-white border-secondary-200 font-bold" placeholder="e.g. Standard NDA" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Document Type</label>
                                <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="select w-full bg-white border-secondary-200 font-bold">
                                    <option value="OFFER_LETTER">Offer Letter</option>
                                    <option value="CONTRACT">Employment Contract</option>
                                    <option value="NDA">Non-Disclosure Agreement</option>
                                    <option value="POLICY">Company Policy</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest flex justify-between">
                                Content (HTML/Snap)
                                <span className="text-[9px] lowercase text-secondary-300">Available tags: {'{{name}}'}, {'{{designation}}'}, {'{{salary}}'}, {'{{joiningDate}}'}, {'{{employeeId}}'}, {'{{companyName}}'}, {'{{date}}'}</span>
                            </label>
                            <textarea value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} className="input w-full h-[400px] py-4 font-mono text-sm leading-relaxed bg-white border-secondary-200" placeholder="<h1>EMPLOYMENT CONTRACT</h1><p>This agreement is between...</p>" />
                        </div>

                        <div className="flex justify-end gap-4 pt-4">
                            <button onClick={() => { setIsEditing(false); setEditingObj(null); }} className="btn bg-secondary-100 px-8 rounded-xl font-bold uppercase text-[10px] tracking-widest">Cancel</button>
                            <button onClick={handleSave} className="btn bg-primary-600 text-white px-10 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg flex items-center gap-2">
                                <Save size={16} /> Save Template
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isIssuing && (
                <div className="card-premium p-8 border-2 border-secondary-900 bg-secondary-900/5">
                    <div className="flex justify-between items-center mb-8">
                        <h4 className="font-black text-secondary-900 uppercase tracking-widest text-xs flex items-center gap-2">
                            <Send className="text-secondary-900" size={18} /> Issue Document to Employee
                        </h4>
                        <button onClick={() => setIsIssuing(false)} className="text-secondary-400 hover:text-secondary-620">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Select Template</label>
                            <select value={issueData.templateId} onChange={e => setIssueData({ ...issueData, templateId: e.target.value })} className="select w-full bg-white border-secondary-200 font-bold">
                                <option value="">--- Choose Template ---</option>
                                {templates?.map((t: any) => <option key={t.id} value={t.id}>{t.title} ({t.type})</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Select Recipient</label>
                            <select value={issueData.employeeId} onChange={e => setIssueData({ ...issueData, employeeId: e.target.value })} className="select w-full bg-white border-secondary-200 font-bold">
                                <option value="">--- Choose Employee ---</option>
                                {employees?.map((e: any) => <option key={e.id} value={e.id}>{e.user?.name || e.user?.email}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 mt-8">
                        <button onClick={() => setIsIssuing(false)} className="btn bg-secondary-100 px-8 rounded-xl font-bold uppercase text-[10px] tracking-widest">Cancel</button>
                        <button onClick={handleIssue} disabled={!issueData.templateId || !issueData.employeeId} className="btn bg-secondary-900 text-white px-10 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg flex items-center gap-2 disabled:opacity-50">
                            <Send size={16} /> Confirm & Send
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates?.map((template: any) => (
                    <div key={template.id} className="card-premium p-6 group hover:border-secondary-900 transition-all border-l-4 border-l-secondary-200">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-3 bg-secondary-50 rounded-2xl text-secondary-600">
                                <FileText size={20} />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setEditingObj(template); setFormData({ title: template.title, type: template.type, content: template.content }); setIsEditing(true); }} className="p-2 text-secondary-300 hover:text-secondary-900 hover:bg-secondary-50 rounded-lg">
                                    <Edit2 size={14} />
                                </button>
                                <button onClick={() => { if (confirm('Delete template?')) remove.mutate(template.id); }} className="p-2 text-secondary-300 hover:text-danger-500 hover:bg-rose-50 rounded-lg">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                        <h4 className="text-lg font-black text-secondary-900 tracking-tight">{template.title}</h4>
                        <div className="mt-2 text-[10px] font-black uppercase text-secondary-400 tracking-widest bg-secondary-50 w-fit px-2 py-0.5 rounded">
                            {template.type}
                        </div>
                        <div className="mt-8 pt-6 border-t border-secondary-50 flex justify-between items-center text-[10px] font-bold text-secondary-400 uppercase tracking-widest">
                            <span>Last Updated {new Date(template.updatedAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
