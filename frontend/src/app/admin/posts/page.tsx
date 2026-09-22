"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Check, Pencil, Trash2, X } from "lucide-react";

interface Post {
    _id: string;
    title?: string | null;
    content: string;
    imageUrl: string | null;
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

export default function PostManagementPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [posts, setPosts] = useState<Post[]>([]);
    const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});
    const [loadingPosts, setLoadingPosts] = useState(true);
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

    const fetchPosts = async () => {
        try {
            const response = await api.get("/posts");
            setPosts(response.data);

            const commentEntries = await Promise.all(
                response.data.map(async (post: Post) => {
                    try {
                        const commentsResponse = await api.get(`/posts/${post._id}/comments`);
                        return [post._id, commentsResponse.data] as const;
                    } catch (error) {
                        console.error(`Failed to fetch comments for post ${post._id}:`, error);
                        return [post._id, []] as const;
                    }
                })
            );
            setCommentsByPost(Object.fromEntries(commentEntries));
        } catch (error) {
            console.error("Failed to fetch posts:", error);
        } finally {
            setLoadingPosts(false);
        }
    };

    const handleEditComment = async (commentId: string) => {
        if (!editedCommentText.trim()) return;

        try {
            await api.put(`/admin/comments/${commentId}`, { text: editedCommentText });
            setCommentsByPost((currentComments) => {
                const updatedComments = { ...currentComments };
                Object.keys(updatedComments).forEach((postId) => {
                    updatedComments[postId] = updatedComments[postId].map((comment) =>
                        comment._id === commentId
                            ? { ...comment, text: editedCommentText.trim() }
                            : comment
                    );
                });
                return updatedComments;
            });
            setEditingCommentId(null);
            setEditedCommentText("");
        } catch (error: any) {
            alert(error.response?.data?.message || "Failed to update comment");
        }
    };

    const handleDeleteComment = async (commentId: string, postId: string) => {
        if (!confirm("Are you sure you want to delete this comment?")) return;

        try {
            await api.delete(`/admin/comments/${commentId}`);
            setCommentsByPost((currentComments) => ({
                ...currentComments,
                [postId]: currentComments[postId].filter((comment) => comment._id !== commentId),
            }));
        } catch (error: any) {
            alert(error.response?.data?.message || "Failed to delete comment");
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!confirm("Are you sure you want to delete this post? This will also delete all comments.")) {
            return;
        }

        try {
            await api.delete(`/admin/posts/${postId}`);
            alert("Post deleted successfully");
            fetchPosts();
        } catch (error: any) {
            alert(error.response?.data?.message || "Failed to delete post");
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
                                        {post.imageUrl && (
                                            <img
                                                src={post.imageUrl}
                                                alt="Post"
                                                className="rounded-lg max-w-md mb-3"
                                            />
                                        )}
                                        <div className="text-sm text-gray-500">
                                            {commentsByPost[post._id]?.length ?? post.commentCount} comment{(commentsByPost[post._id]?.length ?? post.commentCount) !== 1 ? "s" : ""}
                                        </div>

                                        <div className="mt-4 border-t border-gray-100 pt-4">
                                            <h2 className="mb-3 text-sm font-semibold text-gray-900">Comments</h2>
                                            {(commentsByPost[post._id] || []).length === 0 ? (
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
                                                </div>
                                            )}
                                        </div>
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
                    </div>
                )}
            </div>
        </div>
    );
}
