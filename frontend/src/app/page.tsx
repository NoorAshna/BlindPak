"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import PostCard from '@/components/PostCard';
import CreatePost from '@/components/CreatePost';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { Post } from '@/components/PostCard';

interface PostsResponse {
    posts: Post[];
    nextCursor: string | null;
    hasMore: boolean;
}

export default function Home() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const { user, loading: authLoading } = useAuth();
    const { showToast } = useToast();

    const fetchPosts = async () => {
        setLoadingPosts(true);
        try {
            const res = await api.get<PostsResponse>('/posts', { params: { limit: 10 } });
            setPosts(res.data.posts);
            setNextCursor(res.data.nextCursor);
            setHasMore(res.data.hasMore);
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to load posts', 'error');
        } finally {
            setLoadingPosts(false);
        }
    };

    const loadMorePosts = async () => {
        if (!nextCursor || loadingMore) return;

        setLoadingMore(true);
        try {
            const res = await api.get<PostsResponse>('/posts', {
                params: { limit: 10, cursor: nextCursor }
            });
            setPosts((currentPosts) => [...currentPosts, ...res.data.posts]);
            setNextCursor(res.data.nextCursor);
            setHasMore(res.data.hasMore);
        } catch (error: any) {
            showToast('Failed to load more posts', 'error');
        } finally {
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    const handleLike = async (id: string) => {
        try {
            await api.post(`/posts/${id}/like`);
            // Optimistic UI already handled in PostCard, just refresh counts
            setPosts((prev) =>
                prev.map((p) => {
                    if (p._id !== id) return p;
                    const alreadyLiked = user && p.likes?.includes(user._id);
                    return {
                        ...p,
                        likes: alreadyLiked
                            ? p.likes.filter((uid) => uid !== user?._id)
                            : [...(p.likes || []), user?._id || ''],
                    };
                })
            );
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to like post', 'error');
        }
    };

    if (authLoading) return (
        <div className="flex h-screen items-center justify-center text-gray-400">
            Loading…
        </div>
    );

    return (
        <main className="min-h-screen bg-gray-50 px-4 py-6 md:px-8">
            <div className="mx-auto max-w-3xl">
                {/* Hero for non-logged in users */}
                {!user && (
                    <div className="mb-6 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-blue-50 p-6 text-center">
                        <h2 className="text-xl font-bold text-indigo-700 mb-1">Welcome to BlindPak</h2>
                        <p className="text-sm text-gray-600 mb-4">The anonymous forum for Pakistani university students. Share freely, connect honestly.</p>
                        <div className="flex justify-center gap-3">
                            <a href="/register" className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition">
                                Join Now
                            </a>
                            <a href="/login" className="rounded-xl border border-indigo-300 px-5 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition">
                                Log in
                            </a>
                        </div>
                    </div>
                )}

                {user && <CreatePost onPostCreated={fetchPosts} />}

                {loadingPosts ? (
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-200" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {posts.length === 0 ? (
                            <div className="rounded-2xl border border-gray-200 bg-white py-16 text-center">
                                <p className="text-gray-400">No posts yet. Be the first to post!</p>
                            </div>
                        ) : (
                            posts.map((post) => (
                                <PostCard
                                    key={post._id}
                                    post={post}
                                    onLike={handleLike}
                                    onPostUpdated={fetchPosts}
                                    onPostDeleted={fetchPosts}
                                />
                            ))
                        )}

                        {hasMore && (
                            <button
                                onClick={loadMorePosts}
                                disabled={loadingMore}
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 transition"
                            >
                                {loadingMore ? 'Loading…' : 'Load more posts'}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
