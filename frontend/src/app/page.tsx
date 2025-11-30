"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import PostCard from '@/components/PostCard';
import CreatePost from '@/components/CreatePost';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function Home() {
    const [posts, setPosts] = useState([]);
    const { user, loading: authLoading, logout } = useAuth();

    const fetchPosts = async () => {
        try {
            const res = await api.get('/posts');
            // console.log(res.data);
            setPosts(res.data);
        } catch (error) {
            console.error(error);
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
            <div className="mx-auto max-w-2xl">
                {user && <CreatePost onPostCreated={fetchPosts} />}

                <div className="space-y-4">
                    {posts.map((post: any) => (
                        <PostCard key={post._id} post={post} onLike={handleLike} />
                    ))}
                </div>
            </div>
        </main>
    );
}
