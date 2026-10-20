"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Check, Pencil, Trash2, X } from "lucide-react";

interface Post {
    _id: string;
    title?: string | null;
    content: string;
    user: {
        _id: string;
        name: string;
        university: string;
    };
    createdAt: string;
    commentCount: number;
}

interface Comment {
    _id: string;
    text: string;
    postId: string;
    userId?: {
        name: string;
    };
    user?: {
        name: string;
    };
    createdAt: string;
}

interface PostsResponse {
    posts: Post[];
    nextCursor: string | null;
    hasMore: boolean;
}

interface CommentsResponse {
    comments: Comment[];
    nextCursor: string | null;
    hasMore: boolean;
}

export default function PostManagementPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [posts, setPosts] = useState<Post[]>([]);
    const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});
    const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
    const [commentCursors, setCommentCursors] = useState<Record<string, string | null>>({});
    const [commentHasMore, setCommentHasMore] = useState<Record<string, boolean>>({});
    const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [loadingMorePosts, setLoadingMorePosts] = useState(false);
    const [nextPostCursor, setNextPostCursor] = useState<string | null>(null);
    const [hasMorePosts, setHasMorePosts] = useState(true);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editedCommentText, setEditedCommentText] = useState("");

    useEffect(() => {
        if (!loading && (!user || user.role !== 'admin')) {
            router.push("/");
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user?.role === 'admin') {
            fetchPosts();
        }
    }, [user]);

    const fetchPosts = async (append = false) => {
        if (append) {
            setLoadingMorePosts(true);
        } else {
            setLoadingPosts(true);
        }

        try {
            const response = await api.get<PostsResponse>("/posts", {
                params: { limit: 10, ...(append && nextPostCursor ? { cursor: nextPostCursor } : {}) }
            });
            setPosts((currentPosts) => append ? [...currentPosts, ...response.data.posts] : response.data.posts);
            setNextPostCursor(response.data.nextCursor);
            setHasMorePosts(response.data.hasMore);
        } catch (error) {
            console.error("Failed to fetch posts:", error);
        } finally {
            setLoadingPosts(false);
            setLoadingMorePosts(false);
        }
    };

    const togglePostComments = async (postId: string) => {
        const isExpanded = expandedPosts.has(postId);
        if (isExpanded) {
            setExpandedPosts((currentPosts) => {
                const nextPosts = new Set(currentPosts);
                nextPosts.delete(postId);
                return nextPosts;
            });
            return;
        }

        setExpandedPosts((currentPosts) => new Set(currentPosts).add(postId));
        if (commentsByPost[postId]) return;

        setLoadingComments((currentLoading) => ({ ...currentLoading, [postId]: true }));
        try {
            const response = await api.get<CommentsResponse>(`/posts/${postId}/comments`, {
                params: { limit: 10 }
            });
            setCommentsByPost((currentComments) => ({
                ...currentComments,
                [postId]: response.data.comments,
            }));
            setCommentCursors((currentCursors) => ({
                ...currentCursors,
                [postId]: response.data.nextCursor,
            }));
            setCommentHasMore((currentHasMore) => ({
                ...currentHasMore,
                [postId]: response.data.hasMore,
            }));
        } catch (error) {
            console.error(`Failed to fetch comments for post ${postId}:`, error);
        } finally {
            setLoadingComments((currentLoading) => ({ ...currentLoading, [postId]: false }));
        }
    };

    const loadMoreComments = async (postId: string) => {
        const cursor = commentCursors[postId];
        if (!cursor || loadingComments[postId]) return;

        setLoadingComments((currentLoading) => ({ ...currentLoading, [postId]: true }));
        try {
            const response = await api.get<CommentsResponse>(`/posts/${postId}/comments`, {
                params: { limit: 10, cursor }
            });
            setCommentsByPost((currentComments) => ({
                ...currentComments,
                [postId]: [...(currentComments[postId] || []), ...response.data.comments],
            }));
            setCommentCursors((currentCursors) => ({
                ...currentCursors,
                [postId]: response.data.nextCursor,
            }));
            setCommentHasMore((currentHasMore) => ({
                ...currentHasMore,
                [postId]: response.data.hasMore,
            }));
        } catch (error) {
            console.error(`Failed to load more comments for post ${postId}:`, error);
        } finally {
            setLoadingComments((currentLoading) => ({ ...currentLoading, [postId]: false }));
        }
    };

    const handleEditComment = async (commentId: string) => {
        if (!editedCommentText.trim()) return;

        try {
            const res = await api.put(`/admin/comments/${commentId}`, { text: editedCommentText });
            setCommentsByPost((currentComments) => {
                const updatedComments = { ...currentComments };
                Object.keys(updatedComments).forEach((postId) => {
                    updatedComments[postId] = (updatedComments[postId] || []).map((comment) =>
                        comment._id === commentId
                            ? { ...comment, text: editedCommentText.trim() }
                            : comment
                    );
                });
                return updatedComments;
            });
            setEditingCommentId(null);
            setEditedCommentText("");
            toast.success(res.data?.message || "Comment updated successfully");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update comment");
        }
    };

    const handleDeleteComment = async (commentId: string, postId: string) => {
        if (!confirm("Are you sure you want to delete this comment?")) return;

        try {
            const res = await api.delete(`/admin/comments/${commentId}`);
            setCommentsByPost((currentComments) => ({
                ...currentComments,
                [postId]: (currentComments[postId] || []).filter((comment) => comment._id !== commentId),
            }));
            toast.success(res.data?.message || "Comment deleted successfully");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete comment");
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!confirm("Are you sure you want to delete this post? This will also delete all comments.")) {
            return;
        }

        try {
            const res = await api.delete(`/admin/posts/${postId}`);
            toast.success(res.data?.message || "Post deleted successfully");
            fetchPosts();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete post");
        }
    };

    if (loading || user?.role !== 'admin') {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Post Management</h1>

                {loadingPosts ? (
                    <div className="text-center py-8">Loading posts...</div>
                ) : (
                    <div className="space-y-4">
                        {posts.map((post) => (
                            <div key={post._id} className="bg-white shadow rounded-lg p-6">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center mb-2">
                                            <span className="font-semibold text-gray-900">{post.user.name}</span>
                                            <span className="mx-2 text-gray-400">•</span>
                                            <span className="text-sm text-gray-500">{post.user.university}</span>
                                            <span className="mx-2 text-gray-400">•</span>
                                            <span className="text-sm text-gray-500">
                                                {new Date(post.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {post.title && (
                                            <p className="font-bold text-gray-900 mb-1">{post.title}</p>
                                        )}
                                        <p className="text-gray-700 mb-3">
                                            {post.content.length > 200 ? `${post.content.slice(0, 200)}...` : post.content}
                                        </p>
                                        <div className="text-sm text-gray-500">
                                            {post.commentCount} comment{post.commentCount !== 1 ? "s" : ""}
                                        </div>

                                        <button
                                            onClick={() => togglePostComments(post._id)}
                                            className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                                        >
                                            {expandedPosts.has(post._id) ? "Hide comments" : "View comments"}
                                        </button>

                                        {expandedPosts.has(post._id) && (
                                            <div className="mt-4 border-t border-gray-100 pt-4">
                                                <h2 className="mb-3 text-sm font-semibold text-gray-900">Comments</h2>
                                                {loadingComments[post._id] && !commentsByPost[post._id] ? (
                                                    <p className="text-sm text-gray-500">Loading comments...</p>
                                                ) : (commentsByPost[post._id] || []).length === 0 ? (
                                                    <p className="text-sm text-gray-500">No comments on this post.</p>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {commentsByPost[post._id].map((comment) => {
                                                        const commenterName = comment.userId?.name || comment.user?.name || "Unknown user";
                                                        const isEditing = editingCommentId === comment._id;

                                                        return (
                                                            <div key={comment._id} className="rounded-md bg-gray-50 p-3">
                                                                <div className="mb-2 flex items-center justify-between gap-3">
                                                                    <div>
                                                                        <span className="text-sm font-semibold text-gray-900">{commenterName}</span>
                                                                        <span className="ml-2 text-xs text-gray-500">
                                                                            {new Date(comment.createdAt).toLocaleString()}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        {isEditing ? (
                                                                            <>
                                                                                <button
                                                                                    onClick={() => handleEditComment(comment._id)}
                                                                                    className="rounded p-1 text-green-600 hover:bg-green-100"
                                                                                    title="Save comment"
                                                                                >
                                                                                    <Check size={16} />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => setEditingCommentId(null)}
                                                                                    className="rounded p-1 text-gray-500 hover:bg-gray-200"
                                                                                    title="Cancel editing"
                                                                                >
                                                                                    <X size={16} />
                                                                                </button>
                                                                            </>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => {
                                                                                    setEditingCommentId(comment._id);
                                                                                    setEditedCommentText(comment.text);
                                                                                }}
                                                                                className="rounded p-1 text-blue-600 hover:bg-blue-100"
                                                                                title="Edit comment"
                                                                            >
                                                                                <Pencil size={16} />
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            onClick={() => handleDeleteComment(comment._id, post._id)}
                                                                            className="rounded p-1 text-red-600 hover:bg-red-100"
                                                                            title="Delete comment"
                                                                        >
                                                                            <Trash2 size={16} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                {isEditing ? (
                                                                    <textarea
                                                                        value={editedCommentText}
                                                                        onChange={(event) => setEditedCommentText(event.target.value)}
                                                                        className="w-full rounded border border-gray-300 p-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none"
                                                                        rows={2}
                                                                    />
                                                                ) : (
                                                                    <p className="text-sm text-gray-700">{comment.text}</p>
                                                                )}
                                                            </div>
                                                        );
                                                        })}
                                                        {commentHasMore[post._id] && (
                                                            <button
                                                                onClick={() => loadMoreComments(post._id)}
                                                                disabled={loadingComments[post._id]}
                                                                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                                                            >
                                                                {loadingComments[post._id] ? "Loading..." : "Load more comments"}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleDeletePost(post._id)}
                                        className="ml-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                    >
                                        Delete Post
                                    </button>
                                </div>
                            </div>
                        ))}
                        {hasMorePosts && (
                            <button
                                onClick={() => fetchPosts(true)}
                                disabled={loadingMorePosts}
                                className="w-full rounded-lg bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
                            >
                                {loadingMorePosts ? "Loading..." : "Load more posts"}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
