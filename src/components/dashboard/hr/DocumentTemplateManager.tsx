'use client';

import { useMemo, useRef, useState } from 'react';
import { useDocumentTemplates, useDocumentTemplateMutations, useEmployees, useDigitalDocumentMutations } from '@/hooks/useHR';
import { FileText, Plus, Trash2, Edit2, Save, X, Send, User, Eye, Code2, Type } from 'lucide-react';
import { HR_PRESETS } from '@/lib/hr-presets';
import { DOCUMENT_TYPES } from '@/lib/document-types';
import RichTextEditor, { type RichTextEditorHandle } from '@/components/common/RichTextEditor';
import { LETTER_SHORTCODES } from '@/lib/services/documents/letterVars';

type LetterSettings = { topMarginMm: number; footerText: string; showPageNumbers: boolean };
const DEFAULT_SETTINGS: LetterSettings = { topMarginMm: 4, footerText: '', showPageNumbers: true };

export default function DocumentTemplateManager() {
    const { data: templates } = useDocumentTemplates();
    const { data: employees } = useEmployees();
    const { create, update, remove } = useDocumentTemplateMutations();
    const { generate, generateBulk } = useDigitalDocumentMutations();

    const [isEditing, setIsEditing] = useState(false);
    const [editingObj, setEditingObj] = useState<any>(null);
    const [formData, setFormData] = useState<{ title: string; type: string; content: string; settings: LetterSettings }>({ title: '', type: 'OFFER_LETTER', content: '', settings: { ...DEFAULT_SETTINGS } });

    // Content editor: rich-text (WYSIWYG) by default; HTML source for tables / power edits.
    const [editorMode, setEditorMode] = useState<'rich' | 'html'>('rich');
    const richEditorRef = useRef<RichTextEditorHandle>(null);
    const htmlAreaRef = useRef<HTMLTextAreaElement>(null);
    const insertShortcode = (key: string) => {
        const code = `{{${key}}}`;
        if (editorMode === 'rich') { richEditorRef.current?.insert(code); return; }
        const ta = htmlAreaRef.current;
        if (!ta) { setFormData((f) => ({ ...f, content: `${f.content} ${code}` })); return; }
        const start = ta.selectionStart ?? ta.value.length;
        const end = ta.selectionEnd ?? ta.value.length;
        const next = ta.value.slice(0, start) + code + ta.value.slice(end);
        setFormData((f) => ({ ...f, content: next }));
        requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start + code.length, start + code.length); });
    };
    // Quill can't edit tables reliably; drop a starter table and switch to HTML mode.
    const insertTable = () => {
        const table = `\n<table border="1" style="width:100%; border-collapse:collapse; text-align:left;">\n<tr><th>Column 1</th><th>Column 2</th></tr>\n<tr><td>Value</td><td>Value</td></tr>\n</table>\n`;
        setEditorMode('html');
        setFormData((f) => ({ ...f, content: (f.content || '') + table }));
    };

    const [isIssuing, setIsIssuing] = useState(false);
    const [issueData, setIssueData] = useState({ templateId: '', employeeId: '' });
    // Single recipient, or bulk to everyone / a designation / an employee-type.
    const [issueMode, setIssueMode] = useState<'SINGLE' | 'BULK'>('SINGLE');
    const [bulkTarget, setBulkTarget] = useState<'ALL' | 'DESIGNATION' | 'EMPLOYEE_TYPE'>('ALL');
    const [bulkDesignation, setBulkDesignation] = useState('');
    const [bulkEmployeeType, setBulkEmployeeType] = useState('');
    // Person-specific values not on the employee record (e.g. relievingDate, freelanceFee).
    const [customText, setCustomText] = useState('');
    const parseCustomFields = (text: string): Record<string, string> => {
        const out: Record<string, string> = {};
        text.split('\n').forEach((line) => {
            const i = line.indexOf(':');
            if (i > 0) { const k = line.slice(0, i).trim(); if (k) out[k] = line.slice(i + 1).trim(); }
        });
        return out;
    };

    const designationOptions = useMemo(
        () => Array.from(new Set((employees || []).map((e: any) => e.designation).filter(Boolean))).sort(),
        [employees]
    );
    const employeeTypeOptions = useMemo(
        () => Array.from(new Set((employees || []).map((e: any) => e.employeeType).filter(Boolean))).sort(),
        [employees]
    );

    const canIssue = issueData.templateId && (
        issueMode === 'SINGLE'
            ? !!issueData.employeeId
            : bulkTarget === 'ALL'
                || (bulkTarget === 'DESIGNATION' && !!bulkDesignation)
                || (bulkTarget === 'EMPLOYEE_TYPE' && !!bulkEmployeeType)
    );

    const handleSave = async () => {
        try {
            if (editingObj) {
                await update.mutateAsync({ id: editingObj.id, ...formData });
            } else {
                await create.mutateAsync(formData);
            }
            setIsEditing(false);
            setEditingObj(null);
            setFormData({ title: '', type: 'OFFER_LETTER', content: '', settings: { ...DEFAULT_SETTINGS } });
        } catch (err) {
            alert('Failed to save template');
        }
    };

    const handleIssue = async () => {
        try {
            if (issueMode === 'BULK') {
                const filters =
                    bulkTarget === 'DESIGNATION' ? { designation: bulkDesignation }
                        : bulkTarget === 'EMPLOYEE_TYPE' ? { employeeType: bulkEmployeeType }
                            : {}; // ALL active employees in the company
                const res: any = await generateBulk.mutateAsync({ templateId: issueData.templateId, filters });
                const ok = (res?.results || []).filter((r: any) => r.status === 'SUCCESS').length;
                alert(`Document issued to ${ok}/${res?.total ?? ok} employees.`);
            } else {
                await generate.mutateAsync({ ...issueData, customFields: parseCustomFields(customText) });
                alert('Document generated and sent to employee portal!');
            }
            setIsIssuing(false);
        } catch (err) {
            alert('Failed to issue document');
        }
    };

    const [previewing, setPreviewing] = useState(false);
    // Live preview: renders the letter to a PDF (sample data, or a chosen employee's real
    // data) WITHOUT saving anything, and opens it in a new tab.
    const previewPdf = async (payload: { content?: string; templateId?: string; employeeId?: string; title?: string; customFields?: Record<string, string>; settings?: LetterSettings }) => {
        setPreviewing(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
            const res = await fetch('/api/hr/digital-documents/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            if (!res.ok) { alert('Preview failed — add some content or pick a template first.'); return; }
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => window.URL.revokeObjectURL(url), 60000);
        } catch { alert('Preview error'); }
        finally { setPreviewing(false); }
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
                        onClick={() => { setIsEditing(true); setEditingObj(null); setFormData({ title: '', type: 'OFFER_LETTER', content: '', settings: { ...DEFAULT_SETTINGS } }); }}
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
                                    setFormData({ title: p.title, type: p.type, content: p.content.trim(), settings: { ...DEFAULT_SETTINGS, ...(p.settings || {}) } });
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
                                    {DOCUMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Content</label>
                                <div className="bg-secondary-100 p-1 rounded-lg flex gap-1">
                                    <button type="button" onClick={() => setEditorMode('rich')} className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-all ${editorMode === 'rich' ? 'bg-white text-secondary-900 shadow-sm' : 'text-secondary-500'}`}><Type size={12} /> Rich Text</button>
                                    <button type="button" onClick={() => setEditorMode('html')} className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-all ${editorMode === 'html' ? 'bg-white text-secondary-900 shadow-sm' : 'text-secondary-500'}`}><Code2 size={12} /> HTML</button>
                                </div>
                            </div>

                            {/* Shortcode palette — click to insert; resolved to real data when the letter is issued */}
                            <div className="bg-secondary-50 border border-secondary-200 rounded-xl p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-[9px] font-black text-secondary-400 uppercase tracking-widest">Insert shortcode</p>
                                    <button type="button" onClick={insertTable} className="text-[10px] font-bold bg-white border border-secondary-200 hover:border-primary-400 hover:text-primary-600 text-secondary-600 px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <Code2 size={11} /> Insert table
                                    </button>
                                </div>
                                {LETTER_SHORTCODES.map((group) => (
                                    <div key={group.group} className="flex flex-wrap gap-1.5 items-center">
                                        <span className="text-[9px] font-black text-secondary-400 uppercase w-14 shrink-0">{group.group}</span>
                                        {group.items.map((sc) => (
                                            <button
                                                type="button"
                                                key={sc.key}
                                                onClick={() => insertShortcode(sc.key)}
                                                title={`{{${sc.key}}}`}
                                                className="text-[10px] font-bold bg-white border border-secondary-200 hover:border-primary-400 hover:text-primary-600 text-secondary-600 px-2 py-0.5 rounded-md transition-colors"
                                            >
                                                {sc.label}
                                            </button>
                                        ))}
                                    </div>
                                ))}
                            </div>

                            {editorMode === 'rich' ? (
                                <RichTextEditor
                                    ref={richEditorRef}
                                    value={formData.content}
                                    onChange={(v) => setFormData({ ...formData, content: v })}
                                    placeholder="Compose the letter…"
                                    className="bg-white"
                                />
                            ) : (
                                <textarea ref={htmlAreaRef} value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} className="input w-full h-[400px] py-4 font-mono text-sm leading-relaxed bg-white border-secondary-200" placeholder="<h1>EMPLOYMENT CONTRACT</h1><p>This agreement is between...</p>" />
                            )}
                            <p className="text-[10px] text-secondary-400">Use <strong>HTML</strong> mode for tables and advanced layout. The salary annexure is best inserted via the <strong>Full salary annexure</strong> shortcode.</p>
                        </div>

                        {/* Page setup — letterhead top margin + footer */}
                        <div className="bg-secondary-50 border border-secondary-200 rounded-xl p-4 space-y-3">
                            <p className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Page Setup</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest">Top margin (mm)</label>
                                    <input
                                        type="number" min={0} max={80} step={1}
                                        value={formData.settings.topMarginMm}
                                        onChange={e => setFormData({ ...formData, settings: { ...formData.settings, topMarginMm: Number(e.target.value) } })}
                                        className="input w-full bg-white border-secondary-200 font-bold"
                                    />
                                    <p className="text-[9px] text-secondary-400">Extra space at the top for pre-printed letterhead. Default 4.</p>
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest">Footer text</label>
                                    <input
                                        type="text"
                                        value={formData.settings.footerText}
                                        onChange={e => setFormData({ ...formData, settings: { ...formData.settings, footerText: e.target.value } })}
                                        placeholder="e.g. Authorized Signatory | Candidate's Signature"
                                        className="input w-full bg-white border-secondary-200 font-bold"
                                    />
                                    <p className="text-[9px] text-secondary-400">Shown at the bottom of every page. Use &quot; | &quot; to split into left and right labels.</p>
                                </div>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer w-fit">
                                <input
                                    type="checkbox"
                                    checked={formData.settings.showPageNumbers}
                                    onChange={e => setFormData({ ...formData, settings: { ...formData.settings, showPageNumbers: e.target.checked } })}
                                    className="w-4 h-4 accent-primary-600"
                                />
                                <span className="text-xs font-bold text-secondary-600">Show page numbers (Page X of Y)</span>
                            </label>
                        </div>

                        <div className="flex justify-end gap-4 pt-4">
                            <button onClick={() => { setIsEditing(false); setEditingObj(null); }} className="btn bg-secondary-100 px-8 rounded-xl font-bold uppercase text-[10px] tracking-widest">Cancel</button>
                            <button onClick={() => previewPdf({ content: formData.content, title: formData.title, settings: formData.settings })} disabled={previewing || !formData.content.trim()} className="btn bg-secondary-100 text-secondary-700 px-8 rounded-xl font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 disabled:opacity-50">
                                <Eye size={16} /> {previewing ? 'Preview…' : 'Preview PDF'}
                            </button>
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

                    {/* Single recipient vs bulk */}
                    <div className="flex gap-2 mb-6 bg-secondary-100 p-1 rounded-xl w-fit">
                        <button onClick={() => setIssueMode('SINGLE')} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${issueMode === 'SINGLE' ? 'bg-white text-secondary-900 shadow-sm' : 'text-secondary-500'}`}>Single</button>
                        <button onClick={() => setIssueMode('BULK')} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${issueMode === 'BULK' ? 'bg-white text-secondary-900 shadow-sm' : 'text-secondary-500'}`}>Bulk</button>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Select Template</label>
                            <select value={issueData.templateId} onChange={e => setIssueData({ ...issueData, templateId: e.target.value })} className="select w-full bg-white border-secondary-200 font-bold">
                                <option value="">--- Choose Template ---</option>
                                {templates?.map((t: any) => <option key={t.id} value={t.id}>{t.title} ({t.type})</option>)}
                            </select>
                        </div>

                        {issueMode === 'SINGLE' ? (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Select Recipient</label>
                                <select value={issueData.employeeId} onChange={e => setIssueData({ ...issueData, employeeId: e.target.value })} className="select w-full bg-white border-secondary-200 font-bold">
                                    <option value="">--- Choose Employee ---</option>
                                    {employees?.map((e: any) => <option key={e.id} value={e.id}>{e.user?.name || e.user?.email}</option>)}
                                </select>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Issue To</label>
                                <select value={bulkTarget} onChange={e => setBulkTarget(e.target.value as any)} className="select w-full bg-white border-secondary-200 font-bold">
                                    <option value="ALL">All employees (company)</option>
                                    <option value="DESIGNATION">By designation</option>
                                    <option value="EMPLOYEE_TYPE">By employee type</option>
                                </select>
                                {bulkTarget === 'DESIGNATION' && (
                                    <select value={bulkDesignation} onChange={e => setBulkDesignation(e.target.value)} className="select w-full bg-white border-secondary-200 font-bold mt-2">
                                        <option value="">--- Choose Designation ---</option>
                                        {designationOptions.map((d: any) => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                )}
                                {bulkTarget === 'EMPLOYEE_TYPE' && (
                                    <select value={bulkEmployeeType} onChange={e => setBulkEmployeeType(e.target.value)} className="select w-full bg-white border-secondary-200 font-bold mt-2">
                                        <option value="">--- Choose Employee Type ---</option>
                                        {employeeTypeOptions.map((t: any) => <option key={t} value={t}>{String(t).replace(/_/g, ' ')}</option>)}
                                    </select>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="mt-4">
                        <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest">Custom fields (optional)</label>
                        <textarea value={customText} onChange={e => setCustomText(e.target.value)} rows={3} className="input w-full mt-1 font-mono text-xs bg-white border-secondary-200" placeholder={"One per line, e.g.\nrelievingDate: 09/06/2026\nfreelanceFee: 700\nserviceScope: Proof Reading"} />
                        <p className="text-[10px] text-secondary-400 mt-1">Fills any {'{{placeholder}}'} not on the employee record — e.g. fees, relieving/resignation dates, service scope.</p>
                    </div>

                    <div className="flex justify-end gap-4 mt-8">
                        <button onClick={() => setIsIssuing(false)} className="btn bg-secondary-100 px-8 rounded-xl font-bold uppercase text-[10px] tracking-widest">Cancel</button>
                        <button onClick={() => previewPdf({ templateId: issueData.templateId, employeeId: issueMode === 'SINGLE' ? (issueData.employeeId || undefined) : undefined, customFields: parseCustomFields(customText) })} disabled={previewing || !issueData.templateId} className="btn bg-secondary-100 text-secondary-700 px-8 rounded-xl font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 disabled:opacity-50">
                            <Eye size={16} /> {previewing ? 'Preview…' : 'Preview'}
                        </button>
                        <button onClick={handleIssue} disabled={!canIssue} className="btn bg-secondary-900 text-white px-10 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg flex items-center gap-2 disabled:opacity-50">
                            <Send size={16} /> {issueMode === 'BULK' ? 'Confirm & Send All' : 'Confirm & Send'}
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
                                <button onClick={() => { setEditingObj(template); setFormData({ title: template.title, type: template.type, content: template.content, settings: { ...DEFAULT_SETTINGS, ...(template.settings || {}) } }); setIsEditing(true); }} className="p-2 text-secondary-300 hover:text-secondary-900 hover:bg-secondary-50 rounded-lg">
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
