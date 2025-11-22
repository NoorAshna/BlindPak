"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Image as ImageIcon } from 'lucide-react';

export default function CreatePost({ onPostCreated }: { onPostCreated: () => void }) {
    const { register, handleSubmit, reset } = useForm();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [image, setImage] = useState<File | null>(null);

    if (!user?.isStudent) return null;

    const onSubmit = async (data: any) => {
        setLoading(true);
        const formData = new FormData();
        formData.append('content', data.content);
        if (image) {
            formData.append('image', image);
        }

        try {
            await api.post('/posts', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            reset();
            setImage(null);
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
                <textarea
                    {...register('content', { required: true })}
                    placeholder="What's on your mind?"
                    className="mb-2 w-full resize-none text-gray-700 rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                    rows={3}
                />
                <div className="flex items-center justify-between">
                    <label className="cursor-pointer text-gray-500 hover:text-blue-500">
                        <ImageIcon size={20} />
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => setImage(e.target.files?.[0] || null)}
                        />
                    </label>
                    {image && <span className="text-xs text-gray-500">{image.name}</span>}
                    <button
                        type="submit"
                        disabled={loading}
                        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Posting...' : 'Post'}
                    </button>
                </div>
            </form>
        </div>
    );
}
