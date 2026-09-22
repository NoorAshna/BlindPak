"use client";

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageSquare, Pencil, Trash2, X, Check, MoreHorizontal, Share2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

export interface Post {
    _id: string;
    title?: string | null;
    content: string;
    imageUrl?: string | null;
    likes: string[];
    createdAt: string;
    commentCount: number;
    user?: {
        _id?: string;
        name: string;
        university?: string;
        role?: 'admin' | 'student' | 'public';
    };
    userId?: any;
}

interface PostCardProps {
    post: Post;
    onLike: (id: string) => void;
    onPostUpdated?: () => void;
    onPostDeleted?: () => void;
}

export default function PostCard({ post, onLike, onPostUpdated, onPostDeleted }: PostCardProps) {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState(post.content);
    const [editTitle, setEditTitle] = useState(post.title || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const authorId = post.user?._id || (typeof post.userId === 'object' ? post.userId?._id : post.userId);
    const isOwner = Boolean(user && authorId && user._id === authorId);

    const authorName = post.user?.name || (typeof post.userId === 'object' ? post.userId?.name : 'Unknown User');
    const university = post.user?.university || (typeof post.userId === 'object' ? post.userId?.university : undefined);
    const authorRole = post.user?.role ?? (typeof post.userId === 'object' ? post.userId?.role : undefined);
    const authorInitials = authorName
        .split(' ')
        .map((name: string) => name[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const handleShare = async () => {
        const postUrl = `${window.location.origin}/posts/${post._id}`;
        if (navigator.share) {
            await navigator.share({ title: post.title || authorName, url: postUrl });
        } else {
            await navigator.clipboard.writeText(postUrl);
        }
    };

    const handleSaveEdit = async () => {
        if (!content.trim()) return;
        setIsSubmitting(true);
        setError('');
        try {
            await api.put(`/posts/${post._id}`, { content, title: editTitle || null });
            setIsEditing(false);
            if (onPostUpdated) onPostUpdated();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update post');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this post?')) return;
        setIsSubmitting(true);
        try {
            await api.delete(`/posts/${post._id}`);
            if (onPostDeleted) onPostDeleted();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to delete post');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <article className="mb-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6">
            {/* Header: Author Name, University Tag, and Owner Actions */}
            <div className="mb-6 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-200 text-lg font-bold text-gray-700">
                        {authorInitials || '?'}
                    </div>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-bold text-gray-950">{authorName}</span>
                            <span className="text-gray-400">&bull;</span>
                            <span className="text-gray-500">{formatDistanceToNow(new Date(post.createdAt))} ago</span>
                        </div>
                        <p className="mt-1 truncate text-sm text-gray-500">
{authorRole === 'student' && university && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                            🎓 {university}
                        </span>
                    )}
                    {authorRole === 'admin' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200">
                            🛡️ Admin
                        </span>
                    )}                        </p>
                    </div>
                </div>

                {/* Edit / Delete Buttons for Owner */}
                {isOwner && (
                    <div className="flex items-center space-x-2">
                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                disabled={isSubmitting}
                                className="flex items-center space-x-1 rounded p-1.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition"
                                title="Edit Post"
                            >
                                <Pencil size={15} />
                                <span className="hidden sm:inline">Edit</span>
                            </button>
                        )}
                        <button
                            onClick={handleDelete}
                            disabled={isSubmitting}
                            className="flex items-center space-x-1 rounded p-1.5 text-xs text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
                            title="Delete Post"
                        >
                            <Trash2 size={15} />
                            <span className="hidden sm:inline">Delete</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Post Content or Edit Form */}
            {isEditing ? (
                <div className="mb-3">
                    <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Post heading (optional)"
                        className="mb-2 w-full rounded border border-gray-300 p-2 text-sm font-bold text-gray-900 focus:border-blue-500 focus:outline-none"
                    />
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full rounded border border-gray-300 p-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none"
                        rows={3}
                        autoFocus
                    />
                    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
                    <div className="mt-2 flex items-center justify-end space-x-2">
                        <button
                            onClick={() => {
                                setContent(post.content);
                                setEditTitle(post.title || '');
                                setIsEditing(false);
                            }}
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-1 rounded px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 transition"
                        >
                            <X size={14} /> Cancel
                        </button>
                        <button
                            onClick={handleSaveEdit}
                            disabled={isSubmitting || !content.trim()}
                            className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
                        >
                            <Check size={14} /> {isSubmitting ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            ) : (
                <Link href={`/posts/${post._id}`} className="block">
                    {post.title && (
                        <p className="mb-2 text-2xl font-bold leading-tight text-gray-950">
                            {post.title}
                        </p>
                    )}
                    <p className="mb-4 whitespace-pre-line text-lg leading-relaxed text-gray-800">
                        {post.content.length > 200 ? `${post.content.slice(0, 200)}...` : post.content}
                    </p>
                </Link>
            )}

            {/* Post Image */}
            {post.imageUrl && (
                <Link href={`/posts/${post._id}`} className="mb-4 block">
                    <img src={post.imageUrl} alt="Post" className="h-auto max-h-96 w-full object-cover rounded-md" />
                </Link>
            )}

            {/* Footer: Engagement controls and sharing actions */}
            <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onLike(post._id)}
                        className="flex items-center gap-2 rounded-full bg-gray-50 px-4 py-2 text-sm text-gray-700 transition hover:bg-red-50 hover:text-red-500"
                        aria-label="Like post"
                    >
                        <Heart size={19} strokeWidth={1.8} />
                        <span>{post.likes?.length || 0}</span>
                    </button>
                    <Link
                        href={`/posts/${post._id}`}
                        className="flex items-center gap-2 rounded-full bg-gray-50 px-4 py-2 text-sm text-gray-700 transition hover:bg-blue-50 hover:text-blue-500"
                        aria-label="View comments"
                    >
                        <MessageSquare size={19} strokeWidth={1.8} />
                        <span>{post.commentCount || 0}</span>
                    </Link>
                </div>

                <div className="flex items-center gap-4 text-gray-900">
                    <button
                        onClick={handleShare}
                        className="rounded p-1 transition hover:bg-gray-100"
                        aria-label="Share post"
                        title="Share post"
                    >
                        <Share2 size={22} strokeWidth={1.8} />
                    </button>
                </div>
            </div>
        </article>
    );
}
