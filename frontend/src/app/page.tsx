"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import api from '@/lib/api';
import PostCard from '@/components/PostCard';
import CreatePost from '@/components/CreatePost';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useSocket, PostLikesPayload, PostCommentPayload } from '@/context/SocketContext';
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
    const { socket, joinPostRooms, leavePostRooms } = useSocket();

    // Ref to track sentinel element for infinite scroll
    const observerTarget = useRef<HTMLDivElement>(null);
    // Track joined room IDs to manage room membership efficiently
    const joinedPostIdsRef = useRef<Set<string>>(new Set());

    const fetchPosts = async () => {
        setLoadingPosts(true);
        try {
            const res = await api.get<PostsResponse>('/posts', { params: { limit: 10 } });
            setPosts(res.data.posts);
            setNextCursor(res.data.nextCursor);
            setHasMore(res.data.hasMore);

            // Manage socket rooms for initial posts
            const newIds = res.data.posts.map((p) => p._id);
            // Leave previous rooms if any
            if (joinedPostIdsRef.current.size > 0) {
                leavePostRooms(Array.from(joinedPostIdsRef.current));
                joinedPostIdsRef.current.clear();
            }
            // Join new initial posts rooms
            newIds.forEach((id) => joinedPostIdsRef.current.add(id));
            joinPostRooms(newIds);
        } catch (error: any) {
            showToast(error.response?.data?.message || 'Failed to load posts', 'error');
        } finally {
            setLoadingPosts(false);
        }
    };

    const loadMorePosts = useCallback(async () => {
        if (!nextCursor || loadingMore || !hasMore) return;

        setLoadingMore(true);
        try {
            const res = await api.get<PostsResponse>('/posts', {
                params: { limit: 10, cursor: nextCursor }
            });

            const fetchedPosts = res.data.posts;
            setPosts((currentPosts) => {
                // Deduplicate in case of race condition
                const existingIds = new Set(currentPosts.map((p) => p._id));
                const uniqueNewPosts = fetchedPosts.filter((p) => !existingIds.has(p._id));
                return [...currentPosts, ...uniqueNewPosts];
            });

            setNextCursor(res.data.nextCursor);
            setHasMore(res.data.hasMore);

            // Join socket rooms for newly appended posts
            const newIds = fetchedPosts.map((p) => p._id).filter((id) => !joinedPostIdsRef.current.has(id));
            if (newIds.length > 0) {
                newIds.forEach((id) => joinedPostIdsRef.current.add(id));
                joinPostRooms(newIds);
            }
        } catch (error: any) {
            showToast('Failed to load more posts', 'error');
        } finally {
            setLoadingMore(false);
        }
    }, [nextCursor, loadingMore, hasMore, joinPostRooms, showToast]);

    useEffect(() => {
        fetchPosts();

        return () => {
            if (joinedPostIdsRef.current.size > 0) {
                leavePostRooms(Array.from(joinedPostIdsRef.current));
                joinedPostIdsRef.current.clear();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Listen for real-time post likes and comment updates in joined rooms ──
    useEffect(() => {
        if (!socket) return;

        const handleLikesUpdated = ({ postId, likes }: PostLikesPayload) => {
            setPosts((prevPosts) =>
                prevPosts.map((post) => {
                    if (post._id === postId) {
                        return { ...post, likes };
                    }
                    return post;
                })
            );
        };

        const handleCommentAdded = ({ postId, commentCount }: PostCommentPayload) => {
            setPosts((prevPosts) =>
                prevPosts.map((post) => {
                    if (post._id === postId) {
                        return {
                            ...post,
                            commentCount: typeof commentCount === 'number' ? commentCount : (post.commentCount || 0) + 1,
                        };
                    }
                    return post;
                })
            );
        };

        socket.on('post_likes_updated', handleLikesUpdated);
        socket.on('post_comment_added', handleCommentAdded);

        return () => {
            socket.off('post_likes_updated', handleLikesUpdated);
            socket.off('post_comment_added', handleCommentAdded);
        };
    }, [socket]);

    // ── Infinite scroll via IntersectionObserver on bottom sentinel ─────────
    useEffect(() => {
        const target = observerTarget.current;
        if (!target) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore && !loadingPosts) {
                    loadMorePosts();
                }
            },
            {
                root: null,
                rootMargin: '250px', // trigger 250px before reaching the exact bottom
                threshold: 0.1,
            }
        );

        observer.observe(target);
        return () => observer.disconnect();
    }, [loadMorePosts, hasMore, loadingMore, loadingPosts]);

    const handlePostCreated = (newPost?: Post) => {
        if (newPost && newPost._id) {
            setPosts((prevPosts) => [newPost, ...prevPosts]);
            // Subscribe to real-time events for the new post
            joinedPostIdsRef.current.add(newPost._id);
            joinPostRooms(newPost._id);
        } else {
            fetchPosts();
        }
    };

    const handlePostUpdated = (updatedPostId?: string, updatedData?: Partial<Post>) => {
        if (updatedPostId && updatedData) {
            setPosts((prev) =>
                prev.map((p) => (p._id === updatedPostId ? { ...p, ...updatedData } : p))
            );
        } else {
            fetchPosts();
        }
    };

    const handlePostDeleted = (deletedPostId?: string) => {
        if (deletedPostId) {
            setPosts((prev) => prev.filter((p) => p._id !== deletedPostId));
            joinedPostIdsRef.current.delete(deletedPostId);
            leavePostRooms(deletedPostId);
        } else {
            fetchPosts();
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

                {user && <CreatePost onPostCreated={handlePostCreated} />}

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
                                    onPostUpdated={(data) => handlePostUpdated(post._id, data)}
                                    onPostDeleted={() => handlePostDeleted(post._id)}
                                />
                            ))
                        )}

                        {/* Scroll sentinel for infinite loading */}
                        <div ref={observerTarget} className="h-4 w-full" />

                        {loadingMore && (
                            <div className="flex items-center justify-center py-4 text-sm text-gray-500">
                                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mr-2" />
                                Loading more posts…
                            </div>
                        )}

                        {!hasMore && posts.length > 0 && (
                            <p className="py-6 text-center text-xs text-gray-400">
                                You&apos;ve reached the end of the feed ✨
                            </p>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
