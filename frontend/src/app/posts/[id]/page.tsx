"use client";

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';

export default function PostDetailsPage() {
    const { id } = useParams();
    const [post, setPost] = useState<any>(null);
    const [comments, setComments] = useState([]);
    const { user } = useAuth();
    const { register, handleSubmit, reset } = useForm();
    const [loading, setLoading] = useState(false);

    const fetchPost = async () => {
        try {
            const res = await api.get(`/posts/${id}`);
            setPost(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchComments = async () => {
        try {
            const res = await api.get(`/posts/${id}/comments`);
            setComments(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (id) {
            fetchPost();
            fetchComments();
        }
    }, [id]);

    const onCommentSubmit = async (data: any) => {
        setLoading(true);
        try {
            await api.post(`/posts/${id}/comment`, { text: data.text });
            reset();
            fetchComments();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!post) return <div className="p-8 text-center">Loading post...</div>;

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8">
            <div className="mx-auto max-w-2xl">
                <div className="mb-6 rounded-lg bg-white p-6 shadow">
                    <p className="mb-4 text-lg text-gray-800">{post.content}</p>
                    {post.imageUrl && (
                        <img src={post.imageUrl} alt="Post" className="mb-4 h-auto w-full rounded" />
                    )}
                    <div className="text-sm text-gray-500">
                        Posted {formatDistanceToNow(new Date(post.createdAt))} ago
                    </div>
                </div>

                <div className="mb-6 rounded-lg bg-white p-6 shadow">
                    <h3 className="mb-4 text-lg text-gray-700 font-bold">Comments</h3>

                    <div className="mb-6 space-y-4">
                        {comments.map((comment: any) => (
                            <div key={comment._id} className="border-b pb-2 last:border-0">
                                <p className="text-gray-800">{comment.text}</p>
                                <span className="text-xs text-gray-500">
                                    {formatDistanceToNow(new Date(comment.createdAt))} ago
                                </span>
                            </div>
                        ))}
                        {comments.length === 0 && <p className="text-gray-500">No comments yet.</p>}
                    </div>

                    {user && (
                        <form onSubmit={handleSubmit(onCommentSubmit)}>
                            <textarea
                                {...register('text', { required: true })}
                                placeholder="Write a comment..."
                                className="mb-2 w-full resize-none text-gray-700 rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                                rows={2}
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loading ? 'Posting...' : 'Comment'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
