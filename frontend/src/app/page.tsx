"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import PostCard from '@/components/PostCard';
import CreatePost from '@/components/CreatePost';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
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
    const { user, loading: authLoading, logout } = useAuth();

    const fetchPosts = async () => {
        setLoadingPosts(true);
        try {
            const res = await api.get<PostsResponse>('/posts', { params: { limit: 10 } });
            setPosts(res.data.posts);
            setNextCursor(res.data.nextCursor);
            setHasMore(res.data.hasMore);
        } catch (error) {
            console.error(error);
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
        } catch (error) {
            console.error(error);
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
            fetchPosts();
        } catch (error) {
            console.error(error);
        }
    };

    if (authLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

    return (
        <main className="min-h-screen bg-gray-100 p-4 md:p-8">
            <div className="mx-auto max-w-3xl">
                {user && <CreatePost onPostCreated={fetchPosts} />}

                {loadingPosts ? (
                    <div className="py-8 text-center text-gray-500">Loading posts...</div>
                ) : (
                    <div className="space-y-4">
                    {posts.map((post) => (
                        <PostCard
                            key={post._id}
                            post={post}
                            onLike={handleLike}
                            onPostUpdated={fetchPosts}
                            onPostDeleted={fetchPosts}
                        />
                    ))}
                    {hasMore && (
                        <button
                            onClick={loadMorePosts}
                            disabled={loadingMore}
                            className="w-full rounded-lg bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
                        >
                            {loadingMore ? 'Loading...' : 'Load more posts'}
                        </button>
                    )}
                    </div>
                )}
            </div>
        </main>
    );
}
