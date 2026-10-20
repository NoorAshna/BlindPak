"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useSocket, PostLikesPayload, PostCommentPayload } from '@/context/SocketContext';
import { formatDistanceToNow } from 'date-fns';
import { useParams, useRouter } from 'next/navigation';
import { Pencil, Trash2, Check, X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import MentionTextarea from '@/components/MentionTextarea';

interface CommentsResponse {
    comments: any[];
    nextCursor: string | null;
    hasMore: boolean;
}

export default function PostDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const [post, setPost] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [commentsCursor, setCommentsCursor] = useState<string | null>(null);
    const [hasMoreComments, setHasMoreComments] = useState(false);
    const [loadingMoreComments, setLoadingMoreComments] = useState(false);
    const { user } = useAuth();
    const { showToast } = useToast();
    const { socket, joinPostRooms, leavePostRooms } = useSocket();
    const [commentText, setCommentText] = useState('');
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [editTitle, setEditTitle] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [loadingPost, setLoadingPost] = useState(true);
    const [postError, setPostError] = useState<string | null>(null);

    const fetchPost = async () => {
        setLoadingPost(true);
        setPostError(null);
        try {
            const res = await api.get(`/posts/${id}`);
            setPost(res.data);
            setEditContent(res.data.content);
            setEditTitle(res.data.title || '');
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Post not found or has been deleted.';
            setPostError(msg);
            showToast(msg, 'error');
        } finally {
            setLoadingPost(false);
        }
    };

    const fetchComments = async () => {
        try {
            const res = await api.get<CommentsResponse>(`/posts/${id}/comments`, {
                params: { limit: 10 }
            });
            setComments(res.data.comments);
            setCommentsCursor(res.data.nextCursor);
            setHasMoreComments(res.data.hasMore);
        } catch (error) {
            console.error(error);
        }
    };

    const loadMoreComments = async () => {
        if (!id || !commentsCursor || loadingMoreComments) return;
        setLoadingMoreComments(true);
        try {
            const res = await api.get<CommentsResponse>(`/posts/${id}/comments`, {
                params: { limit: 10, cursor: commentsCursor }
            });
            setComments((prev) => [...prev, ...res.data.comments]);
            setCommentsCursor(res.data.nextCursor);
            setHasMoreComments(res.data.hasMore);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingMoreComments(false);
        }
    };

    useEffect(() => {
        if (id) {
            const postId = Array.isArray(id) ? id[0] : id;
            fetchPost();
            fetchComments();

            // Join the specific post room for live likes and comments
            joinPostRooms(postId);

            return () => {
                leavePostRooms(postId);
            };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Listen to real-time events for this post
    useEffect(() => {
        if (!socket || !id) return;
        const currentPostId = Array.isArray(id) ? id[0] : id;

        const handleLikesUpdated = ({ postId, likes }: PostLikesPayload) => {
            if (postId === currentPostId) {
                setPost((prev: any) => (prev ? { ...prev, likes } : prev));
            }
        };

        const handleCommentAdded = ({ postId, comment }: PostCommentPayload) => {
            if (postId === currentPostId && comment) {
                setComments((prev) => {
                    // Avoid duplicating comment if already added locally
                    if (prev.some((c: any) => c._id === comment._id)) return prev;
                    return [...prev, comment];
                });
            }
        };

        socket.on('post_likes_updated', handleLikesUpdated);
        socket.on('post_comment_added', handleCommentAdded);

        return () => {
            socket.off('post_likes_updated', handleLikesUpdated);
            socket.off('post_comment_added', handleCommentAdded);
        };
    }, [socket, id]);

    const authorId = post?.user?._id || post?.userId?._id || post?.userId;
    const isOwner = Boolean(user && authorId && user._id === (typeof authorId === 'object' ? authorId._id : authorId));
    const authorName = post?.user?.name || post?.userId?.name || 'Unknown User';
    const university = post?.user?.university || post?.userId?.university;
    const authorRole = post?.user?.role ?? post?.userId?.role;

    const handleSaveEdit = async () => {
        if (!editContent.trim()) return;
        setIsSaving(true);
        try {
            const res = await api.put(`/posts/${id}`, { content: editContent, title: editTitle || null });
            setIsEditing(false);
            showToast(res.data?.message || 'Post updated successfully', 'success');
            fetchPost();
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to update post', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this post? This cannot be undone.')) return;
        setIsSaving(true);
        try {
            const res = await api.delete(`/posts/${id}`);
            showToast(res.data?.message || 'Post deleted', 'info');
            router.push('/');
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to delete post', 'error');
            setIsSaving(false);
        }
    };

    const onCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) {
            showToast('Comment cannot be empty', 'warning');
            return;
        }
        setLoading(true);
        try {
            const res = await api.post(`/posts/${id}/comment`, { text: commentText });
            setCommentText('');
            fetchComments();
            showToast(res.data?.message || 'Comment posted successfully!', 'success');
        } catch (err: any) {
            showToast(err.response?.data?.message || 'Failed to post comment', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (loadingPost) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-gray-500">
                <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                <p className="text-sm">Loading post…</p>
            </div>
        );
    }

    if (postError || !post) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-4">
                <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
                        <X size={28} />
                    </div>
                    <h2 className="mb-2 text-xl font-bold text-gray-900">Post Not Found</h2>
                    <p className="mb-6 text-sm text-gray-600">
                        {postError || "The post you are trying to view does not exist or may have been deleted by its author."}
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 shadow-sm"
                    >
                        <ArrowLeft size={16} />
                        Back to Community Feed
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="mx-auto max-w-2xl">
                {/* Back button */}
                <Link href="/" className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition">
                    <ArrowLeft size={15} /> Back to feed
                </Link>

                {/* Post card */}
                <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    {/* Author info */}
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link href={`/profile/${typeof authorId === 'object' ? authorId._id : authorId}`}>
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-base font-bold text-indigo-700 hover:ring-2 hover:ring-indigo-300 transition">
                                    {authorName.slice(0, 2).toUpperCase()}
                                </div>
                            </Link>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Link href={`/profile/${typeof authorId === 'object' ? authorId._id : authorId}`} className="font-bold text-gray-900 hover:text-indigo-600 transition">
                                        {authorName}
                                    </Link>
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
                                <p className="text-xs text-gray-400">
                                    Posted {formatDistanceToNow(new Date(post.createdAt))} ago
                                </p>
                            </div>
                        </div>

                        {isOwner && (
                            <div className="flex items-center space-x-1">
                                {!isEditing && (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        disabled={isSaving}
                                        className="flex items-center gap-1 rounded-lg p-1.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition"
                                        title="Edit Post"
                                    >
                                        <Pencil size={15} />
                                        <span>Edit</span>
                                    </button>
                                )}
                                <button
                                    onClick={handleDelete}
                                    disabled={isSaving}
                                    className="flex items-center gap-1 rounded-lg p-1.5 text-xs text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
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
                            <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                placeholder="Post heading (optional)"
                                className="mb-2 w-full rounded-xl border border-gray-300 p-2.5 text-base font-bold text-gray-900 focus:border-blue-500 focus:outline-none"
                            />
                            <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full rounded-xl border border-gray-300 p-2.5 text-base text-gray-800 focus:border-blue-500 focus:outline-none"
                                rows={5}
                                autoFocus
                            />
                            <div className="mt-2 flex items-center justify-end space-x-2">
                                <button
                                    onClick={() => { setEditContent(post.content); setEditTitle(post.title || ''); setIsEditing(false); }}
                                    disabled={isSaving}
                                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
                                >
                                    <X size={14} /> Cancel
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={isSaving || !editContent.trim()}
                                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    <Check size={14} /> {isSaving ? 'Saving…' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {post.title && (
                                <p className="mb-3 text-2xl font-bold text-gray-950 leading-snug">{post.title}</p>
                            )}
                            <p className="whitespace-pre-line text-lg text-gray-800 leading-relaxed">{post.content}</p>
                        </>
                    )}
                </div>

                {/* Comments section */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-5 text-base font-bold text-gray-900">
                        Comments ({comments.length}{hasMoreComments ? '+' : ''})
                    </h3>

                    {/* Comment list */}
                    <div className="mb-6 space-y-4">
                        {comments.length === 0 && (
                            <p className="text-sm text-gray-400">No comments yet. Be the first to comment!</p>
                        )}

                        {comments.map((comment: any) => {
                            const commenterName = comment.userId?.name || comment.user?.name || 'Unknown User';
                            const commenterUniversity = comment.userId?.university || comment.user?.university;
                            const commenterRole = comment.userId?.role || comment.user?.role;
                            const commenterId = comment.userId?._id || comment.user?._id;

                            // Render @mentions as links
                            const renderCommentText = (text: string) => {
                                const parts = text.split(/(@[A-Za-z0-9]+)/g);
                                return parts.map((part, i) =>
                                    part.startsWith('@') ? (
                                        <span key={i} className="font-semibold text-indigo-600">{part}</span>
                                    ) : (
                                        part
                                    )
                                );
                            };

                            return (
                                <div key={comment._id} className="flex gap-3">
                                    <Link href={`/profile/${commenterId}`} className="shrink-0">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 hover:ring-2 hover:ring-indigo-200 transition">
                                            {commenterName.slice(0, 2).toUpperCase()}
                                        </div>
                                    </Link>
                                    <div className="flex-1 rounded-xl bg-gray-50 px-4 py-3">
                                        <div className="mb-1 flex flex-wrap items-center gap-2">
                                            <Link href={`/profile/${commenterId}`} className="text-sm font-bold text-gray-900 hover:text-indigo-600 transition">
                                                {commenterName}
                                            </Link>
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
                                            <span className="ml-auto text-xs text-gray-400">
                                                {formatDistanceToNow(new Date(comment.createdAt))} ago
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-800 leading-relaxed">
                                            {renderCommentText(comment.text)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Load more comments */}
                    {hasMoreComments && (
                        <button
                            type="button"
                            onClick={loadMoreComments}
                            disabled={loadingMoreComments}
                            className="mb-6 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                        >
                            {loadingMoreComments ? 'Loading…' : 'Load more comments'}
                        </button>
                    )}

                    {/* Comment input */}
                    {user && user.role !== 'public' && (
                        <form onSubmit={onCommentSubmit}>
                            <MentionTextarea
                                value={commentText}
                                onChange={setCommentText}
                                rows={2}
                                disabled={loading}
                                className="mb-2"
                            />
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={loading || !commentText.trim()}
                                    className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                                >
                                    {loading ? 'Posting…' : 'Comment'}
                                </button>
                            </div>
                        </form>
                    )}

                    {!user && (
                        <p className="text-center text-sm text-gray-400">
                            <Link href="/login" className="text-indigo-600 hover:underline">Log in</Link> to comment.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
