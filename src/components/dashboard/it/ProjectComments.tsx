/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Reply, User as UserIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
        <div key={comment.id} className={`flex gap-3 ${isReply ? 'mt-4 ml-8 border-l-2 border-gray-100 dark:border-gray-700 pl-4' : 'mt-6 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl'}`}>
            <div className="flex-shrink-0">
                {comment.user.employeeProfile?.profilePicture ? (
                    <img src={comment.user.employeeProfile.profilePicture} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium">
                        {comment.user.name.charAt(0)}
                    </div>
                )}
            </div>
            <div className="flex-1">
                <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">{comment.user.name}</span>
                    <span className="text-xs text-gray-500">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mt-1 text-sm whitespace-pre-wrap">{comment.content}</p>
                
                {!isReply && (
                    <div className="mt-2">
                        <button 
                            onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                            className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 hover:underline"
                        >
                            <Reply className="w-3 h-3" />
                            Reply
                        </button>
                    </div>
                )}

                {replyingTo === comment.id && !isReply && (
                    <div className="mt-3 flex gap-2">
                        <input
                            type="text"
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Write a reply..."
                            className="flex-1 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handlePostComment(comment.id);
                            }}
                        />
                        <button
                            onClick={() => handlePostComment(comment.id)}
                            disabled={loading || !replyContent.trim()}
                            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
                        >
                            Post
                        </button>
                    </div>
                )}

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-2">
                        {comment.replies.map(reply => renderComment(reply, true))}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="mt-6 border-t border-gray-100 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5" />
                Discussion & Comments
            </h3>

            {/* New Comment */}
            <div className="flex gap-3 mb-6">
                <div className="flex-1 relative">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment or update about this project..."
                        rows={3}
                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none pr-12"
                    />
                    <button
                        onClick={() => handlePostComment()}
                        disabled={loading || !newComment.trim()}
                        className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {fetching ? (
                <div className="flex justify-center p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
            ) : comments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No comments yet. Start the discussion!</p>
            ) : (
                <div className="space-y-4">
                    {comments.map(c => renderComment(c))}
                </div>
            )}
        </div>
    );
}
