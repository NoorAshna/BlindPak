"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function CreatePost({ onPostCreated }: { onPostCreated: () => void }) {
    const { register, handleSubmit, reset } = useForm();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    if (user?.role !== 'student' && user?.role !== 'admin') return null;

    const onSubmit = async (data: any) => {
        setLoading(true);
        try {
            await api.post('/posts', { content: data.content, title: data.title || null });
            reset();
            onPostCreated();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mb-6 rounded-lg bg-white p-4 shadow">
            <form onSubmit={handleSubmit(onSubmit)}>
                <input
                    {...register('title')}
                    type="text"
                    placeholder="Heading"
                    className="mb-2 w-full rounded border border-gray-300 p-2 text-sm font-bold text-gray-900 focus:border-blue-500 focus:outline-none"
                />
                <textarea
                    {...register('content', { required: true })}
                    placeholder="What's on your mind?"
                    className="mb-2 w-full resize-none text-gray-700 rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                    rows={3}
                />
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={loading}
                        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Posting... .' : 'Post'}
                    </button>
                </div>
            </form>
        </div>
    );
}
