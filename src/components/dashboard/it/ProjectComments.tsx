/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Reply, User as UserIcon, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface CommentUser {
    id: string;
    name: string;
    employeeProfile: { profilePicture: string | null } | null;
}

interface Comment {
    id: string;
    content: string;
    createdAt: string;
    user: CommentUser;
    replies?: Comment[];
}

export default function ProjectComments({ projectId }: { projectId: string }) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        if (projectId) {
            fetchComments();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    const fetchComments = async () => {
        try {
            setFetching(true);
            const res = await fetch(`/api/it/projects/${projectId}/comments`);
            if (res.ok) {
                const data = await res.json();
                setComments(data);
            }
        } catch (error) {
            console.error('Failed to fetch comments', error);
        } finally {
            setFetching(false);
        }
    };

    const handlePostComment = async (parentId?: string) => {
        const content = parentId ? replyContent : newComment;
        if (!content.trim()) return;

        try {
            setLoading(true);
            const res = await fetch(`/api/it/projects/${projectId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    parentId: parentId || undefined
                })
            });

            if (res.ok) {
                const posted = await res.json();
                if (parentId) {
                    setComments(comments.map(c => 
                        c.id === parentId 
                            ? { ...c, replies: [...(c.replies || []), posted] }
                            : c
                    ));
                    setReplyingTo(null);
                    setReplyContent('');
                } else {
                    setComments([posted, ...comments]);
                    setNewComment('');
                }
            }
        } catch (error) {
            console.error('Failed to post comment', error);
        } finally {
            setLoading(false);
        }
    };

    const renderComment = (comment: Comment, isReply = false) => (
        <motion.div 
            initial={{ opacity: 0, x: isReply ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            key={comment.id} 
            className={`flex gap-4 ${isReply ? 'mt-4 ml-12 border-l-2 border-slate-100 pl-6 pb-2' : 'mt-8 bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow'}`}
        >
            <div className="flex-shrink-0">
                {comment.user.employeeProfile?.profilePicture ? (
                    <img src={comment.user.employeeProfile.profilePicture} alt="" className="w-10 h-10 rounded-2xl object-cover ring-2 ring-slate-50 ring-offset-2 shadow-sm" />
                ) : (
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 font-black text-xs">
                        {comment.user.name.charAt(0)}
                    </div>
                )}
            </div>
            <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <span className="font-black text-[10px] text-slate-900 uppercase tracking-widest">{comment.user.name}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </span>
                    </div>
                    <button className="p-1 hover:bg-slate-50 rounded-lg text-slate-300 transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                </div>
                <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-50/50">
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                </div>
                
                {!isReply && (
                    <div className="mt-3 flex items-center gap-4">
                        <button 
                            onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                            className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 hover:bg-blue-50 px-3 py-1.5 rounded-xl transition-all"
                        >
                            <Reply className="w-3.5 h-3.5" />
                            Synchronize Response
                        </button>
                    </div>
                )}

                <AnimatePresence>
                    {replyingTo === comment.id && !isReply && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 flex gap-3 overflow-hidden"
                        >
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    placeholder="Enter response data..."
                                    className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handlePostComment(comment.id);
                                    }}
                                />
                            </div>
                            <button
                                onClick={() => handlePostComment(comment.id)}
                                disabled={loading || !replyContent.trim()}
                                className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-50 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                            >
                                Dispatch
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-4 space-y-4">
                        {comment.replies.map(reply => renderComment(reply, true))}
                    </div>
                )}
            </div>
        </motion.div>
    );

    return (
        <div className="mt-12 bg-slate-50 border border-slate-200/60 p-10 rounded-[3rem]">
            <div className="flex items-center justify-between mb-8 px-2">
                <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                        <MessageSquare className="w-6 h-6 text-blue-600" />
                        Intelligence Feed
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5 ml-9">Discussion and synchronization log</p>
                </div>
                {comments.length > 0 && (
                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[9px] font-black text-slate-500 uppercase">
                        {comments.length} Data Points
                    </span>
                )}
            </div>

            {/* New Comment */}
            <div className="bg-white p-2 rounded-[2.5rem] shadow-sm border border-slate-200/60 focus-within:shadow-xl focus-within:shadow-blue-500/5 transition-all mb-12">
                <div className="relative">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Log new signal or architectural update..."
                        rows={3}
                        className="w-full bg-slate-50 border-none rounded-[2rem] px-6 py-5 text-sm font-medium text-slate-700 focus:outline-none resize-none placeholder:text-slate-300"
                    />
                    <div className="absolute bottom-4 right-4 flex items-center gap-3">
                        <button
                            onClick={() => handlePostComment()}
                            disabled={loading || !newComment.trim()}
                            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.05] active:scale-95 disabled:opacity-50 transition-all shadow-xl shadow-blue-200 flex items-center gap-2"
                        >
                            {loading ? 'Processing...' : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Broadcast Signal
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {fetching ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-100 border-b-blue-600"></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Retrieving data nodes...</p>
                </div>
            ) : comments.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-[3rem] space-y-4">
                    <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                        <MessageSquare className="h-8 w-8 text-slate-300" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No active discussion signals</p>
                        <p className="text-xs font-bold text-slate-300 mt-1 italic">Initiate protocol to start feedback loop</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {comments.map(c => renderComment(c))}
                </div>
            )}
        </div>
    );
}
