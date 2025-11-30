"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import api from "@/lib/api";

interface Post {
    _id: string;
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

export default function PostManagementPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true);

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

    if (loading || !user?.isAdmin) {
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
                                        <p className="text-gray-700 mb-3">{post.content}</p>
                                        {post.imageUrl && (
                                            <img
                                                src={post.imageUrl}
                                                alt="Post"
                                                className="rounded-lg max-w-md mb-3"
                                            />
                                        )}
                                        <div className="text-sm text-gray-500">
                                            {post.commentCount} comment{post.commentCount !== 1 ? "s" : ""}
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
