"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import api from "@/lib/api";

interface Comment {
    _id: string;
    text: string;
    postId: string;
    userId: {
        _id: string;
        name: string;
    };
    createdAt: string;
}

interface Post {
    _id: string;
    content: string;
}

export default function CommentManagementPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [posts, setPosts] = useState<Post[]>([]);
    const [selectedPostId, setSelectedPostId] = useState<string>("");
    const [comments, setComments] = useState<Comment[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [loadingComments, setLoadingComments] = useState(false);

    useEffect(() => {
        if (!loading && (!user || !user.isAdmin)) {
            router.push("/");
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user?.isAdmin) {
            fetchPosts();
        }
    }, [user]);

    const fetchPosts = async () => {
        try {
            const response = await api.get("/posts");
            setPosts(response.data);
        } catch (error) {
            console.error("Failed to fetch posts:", error);
        } finally {
            setLoadingPosts(false);
        }
    };

    const fetchComments = async (postId: string) => {
        setLoadingComments(true);
        try {
            const response = await api.get(`/posts/${postId}/comments`);
            setComments(response.data);
        } catch (error) {
            console.error("Failed to fetch comments:", error);
        } finally {
            setLoadingComments(false);
        }
    };

    const handlePostSelect = (postId: string) => {
        setSelectedPostId(postId);
        if (postId) {
            fetchComments(postId);
        } else {
            setComments([]);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!confirm("Are you sure you want to delete this comment?")) {
            return;
        }

        try {
            await api.delete(`/admin/comments/${commentId}`);
            alert("Comment deleted successfully");
            if (selectedPostId) {
                fetchComments(selectedPostId);
            }
        } catch (error: any) {
            alert(error.response?.data?.message || "Failed to delete comment");
        }
    };

    if (loading || !user?.isAdmin) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Comment Management</h1>

                {/* Post Selector */}
                <div className="bg-white shadow rounded-lg p-6 mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select a post to view its comments:
                    </label>
                    <select
                        value={selectedPostId}
                        onChange={(e) => handlePostSelect(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-gray-900 border-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                        <option value="" >-- Select a post --</option>
                        {posts.map((post) => (
                            <option key={post._id} value={post._id} >
                                {post.content.substring(0, 100)}
                                {post.content.length > 100 ? "..." : ""}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Comments List */}
                {selectedPostId && (
                    <div>
                        {loadingComments ? (
                            <div className="text-center py-8">Loading comments...</div>
                        ) : comments.length === 0 ? (
                            <div className="bg-white shadow rounded-lg p-6">
                                <p className="text-gray-500 text-center">No comments on this post</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {comments.map((comment) => (
                                    <div key={comment._id} className="bg-white shadow rounded-lg p-6">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center mb-2">
                                                    <span className="font-semibold text-gray-900">
                                                        {comment.userId.name}
                                                    </span>
                                                    <span className="mx-2 text-gray-400">•</span>
                                                    <span className="text-sm text-gray-500">
                                                        {new Date(comment.createdAt).toLocaleDateString()} at{" "}
                                                        {new Date(comment.createdAt).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                                <p className="text-gray-700">{comment.text}</p>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteComment(comment._id)}
                                                className="ml-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
