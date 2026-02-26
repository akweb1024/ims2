'use client';

import { useState } from 'react';
import { 
    MessageSquare, Send, CheckCircle2, XCircle, AlertCircle, Clock, 
    Trash2, User, Globe, Lock, ShieldCheck 
} from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';

interface Suggestion {
    id: string;
    content: string;
    status: 'PENDING' | 'RESOLVED' | 'FAILED' | 'HOLD';
    authorName: string | null;
    authorEmail?: string | null;
    createdAt: string;
    userId: string | null;
    user?: {
        id: string;
        name: string;
        employeeProfile?: {
            profilePicture: string | null;
        };
    };
}

interface ProjectSuggestionsProps {
    projectId: string;
    suggestions: Suggestion[];
    onUpdate: () => void;
    canManage: boolean;
}

export default function ProjectSuggestions({ projectId, suggestions, onUpdate, canManage }: ProjectSuggestionsProps) {
    const [newSuggestion, setNewSuggestion] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSuggestion.trim()) return;

        setSubmitting(true);
        try {
            const response = await fetch(`/api/it/projects/${projectId}/suggestions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newSuggestion }),
            });

            if (response.ok) {
                setNewSuggestion('');
                onUpdate();
            } else {
                alert('Failed to submit suggestion');
            }
        } catch (error) {
            console.error('Error submitting suggestion:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusUpdate = async (suggestionId: string, status: string) => {
        setUpdatingId(suggestionId);
        try {
            const response = await fetch(`/api/it/projects/${projectId}/suggestions/${suggestionId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });

            if (response.ok) {
                onUpdate();
            } else {
                alert('Failed to update status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
        } finally {
            setUpdatingId(null);
        }
    };

    const handleDelete = async (suggestionId: string) => {
        if (!confirm('Are you sure you want to delete this suggestion?')) return;
        
        try {
            const response = await fetch(`/api/it/projects/${projectId}/suggestions/${suggestionId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                onUpdate();
            } else {
                alert('Failed to delete suggestion');
            }
        } catch (error) {
            console.error('Error deleting suggestion:', error);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'RESOLVED': return <CheckCircle2 className="h-4 w-4 text-success-500" />;
            case 'FAILED': return <XCircle className="h-4 w-4 text-danger-500" />;
            case 'HOLD': return <Clock className="h-4 w-4 text-warning-500" />;
            default: return <AlertCircle className="h-4 w-4 text-secondary-400" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'RESOLVED': return 'bg-success-100 text-success-700';
            case 'FAILED': return 'bg-danger-100 text-danger-700';
            case 'HOLD': return 'bg-warning-100 text-warning-700';
            default: return 'bg-secondary-100 text-secondary-600';
        }
    };

    return (
        <div className="space-y-6">
            <div className="card-premium">
                <h3 className="text-lg font-bold text-secondary-900 mb-4 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary-500" />
                    Project Suggestions & Feedback
                </h3>
                
                <form onSubmit={handleSubmit} className="relative">
                    <textarea
                        value={newSuggestion}
                        onChange={(e) => setNewSuggestion(e.target.value)}
                        placeholder="Have a suggestion or found a bug? Tell us here..."
                        className="input-premium pr-12 min-h-[100px] resize-none"
                        disabled={submitting}
                    />
                    <button
                        type="submit"
                        disabled={submitting || !newSuggestion.trim()}
                        className="absolute bottom-3 right-3 p-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-primary-500/20"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </form>
            </div>

            <div className="space-y-4">
                {suggestions.length === 0 ? (
                    <div className="card-premium py-12 text-center text-secondary-500">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No suggestions yet. Be the first to give feedback!</p>
                    </div>
                ) : (
                    suggestions.map((suggestion) => (
                        <div key={suggestion.id} className="card-premium flex flex-col sm:flex-row gap-4 group transition-all hover:border-primary-200">
                            <div className="flex-shrink-0">
                                {suggestion.user?.employeeProfile?.profilePicture ? (
                                    <Image 
                                        src={suggestion.user.employeeProfile.profilePicture} 
                                        alt={suggestion.user?.name || 'User'} 
                                        width={40}
                                        height={40}
                                        className="h-10 w-10 rounded-xl object-cover ring-2 ring-secondary-100"
                                    />
                                ) : (
                                    <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 font-bold">
                                        <User className="h-5 w-5" />
                                    </div>
                                )}
                            </div>

                            <div className="flex-1">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-secondary-900">
                                            {suggestion.user?.name || suggestion.authorName || 'Guest'}
                                        </span>
                                        <span className="text-xs text-secondary-400">
                                            {format(new Date(suggestion.createdAt), 'MMM d, yyyy • h:mm a')}
                                        </span>
                                    </div>
                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${getStatusBadge(suggestion.status)}`}>
                                        {getStatusIcon(suggestion.status)}
                                        {suggestion.status}
                                    </div>
                                </div>

                                <p className="text-secondary-700 text-sm leading-relaxed whitespace-pre-wrap">
                                    {suggestion.content}
                                </p>

                                {canManage && (
                                    <div className="mt-4 pt-4 border-t border-secondary-50 flex flex-wrap items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest mr-auto">Mark Status:</span>
                                        
                                        <button
                                            onClick={() => handleStatusUpdate(suggestion.id, 'RESOLVED')}
                                            disabled={updatingId === suggestion.id}
                                            className={`p-1.5 rounded-lg border text-success-600 hover:bg-success-50 transition-colors ${suggestion.status === 'RESOLVED' ? 'bg-success-50 border-success-200' : 'border-transparent'}`}
                                            title="Mark as Resolved"
                                        >
                                            <CheckCircle2 className="h-4 w-4" />
                                        </button>
                                        
                                        <button
                                            onClick={() => handleStatusUpdate(suggestion.id, 'HOLD')}
                                            disabled={updatingId === suggestion.id}
                                            className={`p-1.5 rounded-lg border text-warning-600 hover:bg-warning-50 transition-colors ${suggestion.status === 'HOLD' ? 'bg-warning-50 border-warning-200' : 'border-transparent'}`}
                                            title="Mark as Hold"
                                        >
                                            <Clock className="h-4 w-4" />
                                        </button>
                                        
                                        <button
                                            onClick={() => handleStatusUpdate(suggestion.id, 'FAILED')}
                                            disabled={updatingId === suggestion.id}
                                            className={`p-1.5 rounded-lg border text-danger-600 hover:bg-danger-50 transition-colors ${suggestion.status === 'FAILED' ? 'bg-danger-50 border-danger-200' : 'border-transparent'}`}
                                            title="Mark as Failed"
                                        >
                                            <XCircle className="h-4 w-4" />
                                        </button>

                                        <div className="w-px h-4 bg-secondary-100 mx-1" />
                                        
                                        <button
                                            onClick={() => handleDelete(suggestion.id)}
                                            className="p-1.5 rounded-lg text-secondary-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                                            title="Delete Suggestion"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
