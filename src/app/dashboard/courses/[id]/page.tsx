'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
    BookOpen, Plus, Edit2, Trash2, Save, Eye, Upload,
    Video, FileText, CheckCircle, GripVertical, X, HelpCircle
} from 'lucide-react';

export default function CourseBuilderPage() {
    const router = useRouter();
    const params = useParams();
    const courseId = params.id as string;

    const [course, setCourse] = useState<any>(null);
    const [modules, setModules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userRole, setUserRole] = useState('');

    // Modal states
    const [showCourseEdit, setShowCourseEdit] = useState(false);
    const [showModuleModal, setShowModuleModal] = useState(false);
    const [showLessonModal, setShowLessonModal] = useState(false);
    const [selectedModule, setSelectedModule] = useState<any>(null);
    const [selectedLesson, setSelectedLesson] = useState<any>(null);

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (user) setUserRole(JSON.parse(user).role);
        fetchCourse();
    }, [courseId]);

    const fetchCourse = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/courses/${courseId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCourse(data);
                setModules(data.modules || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            setSaving(true);
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/courses/${courseId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                const updated = await res.json();
                setCourse(updated);
                setShowCourseEdit(false);
                alert('Course updated successfully!');
            }
        } catch (error) {
            console.error(error);
            alert('Failed to update course');
        } finally {
            setSaving(false);
        }
    };

    const handleAddModule = async (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/courses/${courseId}/modules`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                fetchCourse();
                setShowModuleModal(false);
                form.reset();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleAddLesson = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedModule) return;

        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/courses/modules/${selectedModule.id}/lessons`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                fetchCourse();
                setShowLessonModal(false);
                setSelectedModule(null);
                form.reset();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handlePublish = async () => {
        if (!confirm('Are you sure you want to publish this course? It will be visible to students.')) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/courses/${courseId}/publish`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log('Course Publish Response:', res.status);
            if (res.ok) {
                const result = await res.json();
                console.log('Course Publish Result:', result);
                fetchCourse();
                alert('Course published successfully!');
            } else {
                const error = await res.json();
                console.error('Course Publish Failed:', error);
                alert(error.error || 'Failed to publish course');
            }
        } catch (error) {
            console.error('handlePublish Error:', error);
            alert('Failed to publish course');
        }
    };

    const handleDeleteModule = async (moduleId: string) => {
        if (!confirm('Delete this module and all its lessons?')) return;

        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/courses/modules/${moduleId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchCourse();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteLesson = async (lessonId: string) => {
        if (!confirm('Delete this lesson?')) return;

        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/courses/lessons/${lessonId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchCourse();
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading course...</div>;
    if (!course) return <div className="p-8 text-center">Course not found</div>;

    return (
        <DashboardLayout userRole={userRole}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-black text-secondary-900">{course.title}</h1>
                        <p className="text-secondary-500">Course Builder</p>
                        <div className="flex flex-wrap gap-2 mt-2 items-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${course.isPublished
                                ? 'bg-success-100 text-success-700'
                                : 'bg-warning-100 text-warning-700'
                                }`}>
                                {course.isPublished ? 'PUBLISHED' : 'DRAFT'}
                            </span>
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary-100 text-primary-700">
                                {modules.length} Modules
                            </span>
                            {!course.isPublished && (
                                <div className="flex gap-4 ml-4 text-[10px] font-bold uppercase tracking-wider items-center">
                                    <span className={`flex items-center gap-1 ${modules.length > 0 ? 'text-success-600' : 'text-danger-600'}`}>
                                        {modules.length > 0 ? '✓' : '✗'} 1+ Module
                                        <div className="tooltip">
                                            <HelpCircle size={10} className="text-secondary-400" />
                                            <span className="tooltip-text">Courses need at least one module for structure.</span>
                                        </div>
                                    </span>
                                    <span className={`flex items-center gap-1 ${modules.some(m => m.lessons?.length > 0) ? 'text-success-600' : 'text-danger-600'}`}>
                                        {modules.some(m => (m.lessons?.length || 0) > 0) ? '✓' : '✗'} 1+ Lesson
                                        <div className="tooltip">
                                            <HelpCircle size={10} className="text-secondary-400" />
                                            <span className="tooltip-text">Add at least one lesson to any module to publish.</span>
                                        </div>
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowCourseEdit(true)}
                            className="btn btn-secondary flex items-center gap-2"
                        >
                            <Edit2 size={16} /> Edit Details
                        </button>
                        {!course.isPublished && (
                            <button
                                onClick={handlePublish}
                                disabled={modules.length === 0 || !modules.some(m => m.lessons?.length > 0)}
                                className="btn btn-success flex items-center gap-2"
                            >
                                <Eye size={16} /> Publish Course
                            </button>
                        )}
                        <button
                            onClick={() => router.push(`/dashboard/courses/${courseId}/preview`)}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            <Eye size={16} /> Preview
                        </button>
                    </div>
                </div>


                {/* Course Content */}
                <div className="card-premium p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-secondary-900">Course Content</h2>
                        <button
                            onClick={() => setShowModuleModal(true)}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            <Plus size={16} /> Add Module
                        </button>
                    </div>

                    {modules.length === 0 ? (
                        <div className="text-center py-12 bg-secondary-50 rounded-2xl border-2 border-dashed border-secondary-200">
                            <BookOpen size={48} className="mx-auto text-secondary-300 mb-4" />
                            <h3 className="font-bold text-secondary-900 mb-2">No Modules Yet</h3>
                            <p className="text-secondary-500 mb-4">Start building your course by adding modules</p>
                            <button
                                onClick={() => setShowModuleModal(true)}
                                className="btn btn-primary"
                            >
                                Add First Module
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {modules.map((module, idx) => (
                                <div key={module.id} className="border border-secondary-200 rounded-2xl overflow-hidden">
                                    <div className="bg-secondary-50 p-4 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <GripVertical size={20} className="text-secondary-400 cursor-move" />
                                            <div>
                                                <h3 className="font-bold text-secondary-900">
                                                    Module {idx + 1}: {module.title}
                                                </h3>
                                                {module.description && (
                                                    <p className="text-sm text-secondary-500">{module.description}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedModule(module);
                                                    setShowLessonModal(true);
                                                }}
                                                className="btn btn-sm btn-primary"
                                            >
                                                <Plus size={14} /> Add Lesson
                                            </button>
                                            <button
                                                onClick={() => handleDeleteModule(module.id)}
                                                className="btn btn-sm btn-danger"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Lessons */}
                                    <div className="p-4 space-y-2">
                                        {module.lessons && module.lessons.length > 0 ? (
                                            module.lessons.map((lesson: any, lessonIdx: number) => (
                                                <div
                                                    key={lesson.id}
                                                    className="flex justify-between items-center p-3 bg-white rounded-xl border border-secondary-100 hover:border-primary-200 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <GripVertical size={16} className="text-secondary-300" />
                                                        {lesson.type === 'VIDEO' ? (
                                                            <Video size={16} className="text-primary-600" />
                                                        ) : (
                                                            <FileText size={16} className="text-secondary-600" />
                                                        )}
                                                        <div>
                                                            <p className="font-medium text-secondary-900">
                                                                {lessonIdx + 1}. {lesson.title}
                                                            </p>
                                                            <div className="flex gap-2 text-xs text-secondary-400">
                                                                <span>{lesson.type}</span>
                                                                {lesson.duration && <span>• {lesson.duration} min</span>}
                                                                {lesson.isFree && <span className="text-success-600">• FREE PREVIEW</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => router.push(`/dashboard/courses/lessons/${lesson.id}/edit`)}
                                                            className="text-secondary-400 hover:text-primary-600"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteLesson(lesson.id)}
                                                            className="text-secondary-400 hover:text-danger-600"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-center text-secondary-400 py-4 text-sm">
                                                No lessons yet. Click "Add Lesson" to get started.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Edit Course Modal */}
                {showCourseEdit && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold">Edit Course Details</h3>
                                <button onClick={() => setShowCourseEdit(false)} className="text-secondary-400 hover:text-secondary-900">
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleUpdateCourse} className="space-y-4">
                                <div>
                                    <label className="label">Title</label>
                                    <input name="title" className="input" defaultValue={course.title} required />
                                </div>
                                <div>
                                    <label className="label">Description</label>
                                    <textarea name="description" className="input h-24" defaultValue={course.description} required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Category</label>
                                        <input name="category" className="input" defaultValue={course.category || ''} />
                                    </div>
                                    <div>
                                        <label className="label">Level</label>
                                        <select name="level" className="input" defaultValue={course.level || 'BEGINNER'}>
                                            <option value="BEGINNER">Beginner</option>
                                            <option value="INTERMEDIATE">Intermediate</option>
                                            <option value="ADVANCED">Advanced</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Price</label>
                                        <input name="price" type="number" step="0.01" className="input" defaultValue={course.price} />
                                    </div>
                                    <div>
                                        <label className="label">Estimated Hours</label>
                                        <input name="estimatedHours" type="number" className="input" defaultValue={course.estimatedHours || ''} />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Thumbnail URL</label>
                                    <input name="thumbnailUrl" className="input" defaultValue={course.thumbnailUrl || ''} />
                                </div>
                                <div className="flex gap-2 pt-4">
                                    <button type="submit" disabled={saving} className="btn btn-primary flex-1">
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button type="button" onClick={() => setShowCourseEdit(false)} className="btn btn-secondary">
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Add Module Modal */}
                {showModuleModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl p-8 max-w-lg w-full">
                            <h3 className="text-2xl font-bold mb-6">Add New Module</h3>
                            <form onSubmit={handleAddModule} className="space-y-4">
                                <div>
                                    <label className="label">Module Title</label>
                                    <input name="title" className="input" required placeholder="e.g. Introduction to React" />
                                </div>
                                <div>
                                    <label className="label">Description (Optional)</label>
                                    <textarea name="description" className="input h-20" placeholder="Brief description of this module..." />
                                </div>
                                <div className="flex gap-2 pt-4">
                                    <button type="submit" className="btn btn-primary flex-1">Add Module</button>
                                    <button type="button" onClick={() => setShowModuleModal(false)} className="btn btn-secondary">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Add Lesson Modal */}
                {showLessonModal && selectedModule && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <h3 className="text-2xl font-bold mb-6">Add Lesson to: {selectedModule.title}</h3>
                            <form onSubmit={handleAddLesson} className="space-y-4">
                                <div>
                                    <label className="label">Lesson Title</label>
                                    <input name="title" className="input" required placeholder="e.g. Understanding Components" />
                                </div>
                                <div>
                                    <label className="label">Description (Optional)</label>
                                    <textarea name="description" className="input h-20" placeholder="What will students learn..." />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Type</label>
                                        <select name="type" className="input">
                                            <option value="VIDEO">Video</option>
                                            <option value="TEXT">Text/Article</option>
                                            <option value="DOCUMENT">Document</option>
                                            <option value="QUIZ">Quiz</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Duration (minutes)</label>
                                        <input name="duration" type="number" className="input" placeholder="e.g. 15" />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Content URL (Video/Document link)</label>
                                    <input name="contentUrl" className="input" placeholder="https://..." />
                                </div>
                                <div>
                                    <label className="label">Text Content (for text lessons)</label>
                                    <textarea name="textContent" className="input h-32" placeholder="Lesson content in markdown or plain text..." />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" name="isFree" id="isFree" className="w-4 h-4" />
                                    <label htmlFor="isFree" className="text-sm font-medium">Free Preview (accessible without enrollment)</label>
                                </div>
                                <div className="flex gap-2 pt-4">
                                    <button type="submit" className="btn btn-primary flex-1">Add Lesson</button>
                                    <button type="button" onClick={() => { setShowLessonModal(false); setSelectedModule(null); }} className="btn btn-secondary">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout >
    );
}
