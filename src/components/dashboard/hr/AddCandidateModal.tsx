import { useState } from 'react';
import { X, Upload, Loader2, Link as LinkIcon, FileText, CheckCircle2 } from 'lucide-react';

interface AddCandidateModalProps {
    jobs: any[]; // List of active jobs to select from
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
}

export default function AddCandidateModal({ jobs, onClose, onSubmit }: AddCandidateModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadMode, setUploadMode] = useState<'FILE' | 'URL'>('FILE');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        jobId: '',
        resumeUrl: '',
        resumeFile: null as File | null
    });

    // Mock File Upload
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData({ ...formData, resumeFile: e.target.files[0] });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // If file is selected, we mock the upload URL for now
            let finalResumeUrl = formData.resumeUrl;
            if (uploadMode === 'FILE' && formData.resumeFile) {
                // In a real app, upload to S3 here and get URL
                // For now, create a fake local URL or just use a placeholder
                finalResumeUrl = `https://internal-storage.mock/${formData.resumeFile.name.replace(/\s+/g, '-')}`;
            }

            await onSubmit({
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                jobId: formData.jobId,
                resumeUrl: finalResumeUrl
            });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
                <div className="p-6 border-b border-secondary-50 flex justify-between items-center bg-secondary-50/50">
                    <div>
                        <h3 className="text-xl font-black text-secondary-900">Add Candidate</h3>
                        <p className="text-xs text-secondary-500 font-medium">Manually add a candidate to the pipeline.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-secondary-400 hover:text-secondary-900">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">Full Name *</label>
                            <input
                                required
                                className="w-full bg-secondary-50 border-none rounded-xl p-3 font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500"
                                placeholder="e.g. John Doe"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">Email *</label>
                                <input
                                    required
                                    type="email"
                                    className="w-full bg-secondary-50 border-none rounded-xl p-3 font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500"
                                    placeholder="john@example.com"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">Phone</label>
                                <input
                                    className="w-full bg-secondary-50 border-none rounded-xl p-3 font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500"
                                    placeholder="+91..."
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-1 block">Applying For *</label>
                            <select
                                required
                                className="w-full bg-secondary-50 border-none rounded-xl p-3 font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500"
                                value={formData.jobId}
                                onChange={e => setFormData({ ...formData, jobId: e.target.value })}
                            >
                                <option value="">Select Job Opening</option>
                                {jobs?.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-secondary-400 uppercase tracking-widest mb-2 flex justify-between items-center">
                                <span>Resume / CV</span>
                                <div className="flex bg-secondary-100 rounded-lg p-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setUploadMode('FILE')}
                                        className={`px-2 py-0.5 rounded-md text-[9px] transition-all ${uploadMode === 'FILE' ? 'bg-white shadow text-primary-600 font-bold' : 'text-secondary-500'}`}
                                    >
                                        Upload
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setUploadMode('URL')}
                                        className={`px-2 py-0.5 rounded-md text-[9px] transition-all ${uploadMode === 'URL' ? 'bg-white shadow text-primary-600 font-bold' : 'text-secondary-500'}`}
                                    >
                                        Link
                                    </button>
                                </div>
                            </label>

                            {uploadMode === 'FILE' ? (
                                <div className="border-2 border-dashed border-secondary-200 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-primary-400 transition-colors bg-secondary-50/30 cursor-pointer relative group">
                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={handleFileChange}
                                    />
                                    {formData.resumeFile ? (
                                        <div className="flex flex-col items-center text-success-600 animate-in zoom-in">
                                            <CheckCircle2 size={32} className="mb-2" />
                                            <span className="font-bold text-sm">{formData.resumeFile.name}</span>
                                            <span className="text-xs opacity-70">{(formData.resumeFile.size / 1024 / 1024).toFixed(2)} MB</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="bg-primary-50 text-primary-600 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                                                <Upload size={20} />
                                            </div>
                                            <p className="text-xs font-bold text-secondary-600">Click to upload resume</p>
                                            <p className="text-[10px] text-secondary-400 mt-1">PDF, DOCX up to 10MB</p>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="relative">
                                    <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                                    <input
                                        type="url"
                                        placeholder="https://linkedin.com/in/..."
                                        className="w-full bg-secondary-50 border-none rounded-xl p-3 pl-10 font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500"
                                        value={formData.resumeUrl}
                                        onChange={e => setFormData({ ...formData, resumeUrl: e.target.value })}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || !formData.name || !formData.email || !formData.jobId}
                        className="w-full btn bg-primary-600 hover:bg-primary-700 text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary-200 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Add Candidate to Pipeline'}
                    </button>
                </form>
            </div>
        </div>
    );
}
