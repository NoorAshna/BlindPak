"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Pencil, Trash2, Check, X } from 'lucide-react';

export default function PostDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const [post, setPost] = useState<any>(null);
    const [comments, setComments] = useState([]);
    const { user } = useAuth();
    const { register, handleSubmit, reset } = useForm();
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const fetchPost = async () => {
        try {
            const res = await api.get(`/posts/${id}`);
            console.log(res.data);
            setPost(res.data);
            setEditContent(res.data.content);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchComments = async () => {
        try {
            const res = await api.get(`/posts/${id}/comments`);
            setComments(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (id) {
            fetchPost();
            fetchComments();
        }
    }, [id]);

    const authorId = post?.user?._id || post?.userId?._id || post?.userId;
    const isOwner = Boolean(user && authorId && user._id === (typeof authorId === 'object' ? authorId._id : authorId));

    const authorName = post?.user?.name || post?.userId?.name || 'Unknown User';
    const university = post?.user?.university || post?.userId?.university;
    const authorRole = post?.user?.role ?? post?.userId?.role;

    const handleSaveEdit = async () => {
        if (!editContent.trim()) return;
        setIsSaving(true);
        try {
            await api.put(`/posts/${id}`, { content: editContent });
            setIsEditing(false);
            fetchPost();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to update post');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this post? This cannot be undone.')) return;
        setIsSaving(true);
        try {
            await api.delete(`/posts/${id}`);
            router.push('/');
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to delete post');
            setIsSaving(false);
        }
    };

    const onCommentSubmit = async (data: any) => {
        setLoading(true);
        try {
            await api.post(`/posts/${id}/comment`, { text: data.text });
            reset();
            fetchComments();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!post) return <div className="p-8 text-center">Loading post...</div>;

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8">
            <div className="mx-auto max-w-2xl">
                <div className="mb-6 rounded-lg bg-white p-6 shadow">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-bold text-gray-900">{authorName}</h3>
                            {authorRole === 'student' && university && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                                    🎓 {university}
                                </span>
                            )}
                            {authorRole === 'admin' && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200">
                                    🛡️ Admin
                                </span>
                            )}
                        </div>

                        {/* Owner Controls */}
                        {isOwner && (
                            <div className="flex items-center space-x-2">
                                {!isEditing && (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        disabled={isSaving}
                                        className="flex items-center space-x-1 rounded p-1.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition"
                                        title="Edit Post"
                                    >
                                        <Pencil size={15} />
                                        <span>Edit</span>
                                    </button>
                                )}
                                <button
                                    onClick={handleDelete}
                                    disabled={isSaving}
                                    className="flex items-center space-x-1 rounded p-1.5 text-xs text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
                                    title="Delete Post"
                                >
                                    <Trash2 size={15} />
                                    <span>Delete</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Content or Edit View */}
                    {isEditing ? (
                        <div className="mb-4">
                            <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full rounded border border-gray-300 p-2 text-base text-gray-800 focus:border-blue-500 focus:outline-none"
                                rows={4}
                            />
                            <div className="mt-2 flex items-center justify-end space-x-2">
                                <button
                                    onClick={() => {
                                        setEditContent(post.content);
                                        setIsEditing(false);
                                    }}
                                    disabled={isSaving}
                                    className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
                                >
                                    <X size={14} /> Cancel
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={isSaving || !editContent.trim()}
                                    className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    <Check size={14} /> {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {post.title && (
                                <p className="mb-2 text-xl font-bold text-gray-900 leading-snug">{post.title}</p>
                            )}
                            <p className="mb-4 whitespace-pre-line text-lg text-gray-800 leading-relaxed">{post.content}</p>
                        </>
                    )}

                    {post.imageUrl && (
                        <img src={post.imageUrl} alt="Post" className="mb-4 h-auto w-full rounded" />
                    )}
                    <div className="text-sm text-gray-500">
                        Posted {formatDistanceToNow(new Date(post.createdAt))} ago
                    </div>
                </div>

                <div className="mb-6 rounded-lg bg-white p-6 shadow">
                    <h3 className="mb-4 text-lg text-gray-700 font-bold">Comments</h3>

                    <div className="mb-6 space-y-4">
                        {comments.map((comment: any) => {
                            const commenterName = comment.userId?.name || comment.user?.name || 'Unknown User';
                            const commenterUniversity = comment.userId?.university || comment.user?.university;
                            const commenterRole = comment.userId?.role || comment.user?.role;

                            return (
                                <div key={comment._id} className="border-b pb-2 last:border-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-bold text-gray-900">{commenterName}</p>
                                        {commenterRole === 'student' && commenterUniversity && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-200">
                                                🎓 {commenterUniversity}
                                            </span>
                                        )}
                                        {commenterRole === 'admin' && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 border border-purple-200">
                                                🛡️ Admin
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-gray-800">{comment.text}</p>
                                    <span className="text-xs text-gray-500">
                                        {formatDistanceToNow(new Date(comment.createdAt))} ago
                                    </span>
                                </div>
                            );
                        })}
                        {comments.length === 0 && <p className="text-gray-500">No comments yet.</p>}
                    </div>

                    {user && (
                        <form onSubmit={handleSubmit(onCommentSubmit)}>
                            <textarea
                                {...register('text', { required: true })}
                                placeholder="Write a comment..."
                                className="mb-2 w-full resize-none text-gray-700 rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                                rows={2}
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loading ? 'Posting...' : 'Comment'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
