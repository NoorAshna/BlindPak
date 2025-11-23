"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const { login } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const onSubmit = async (data: any) => {
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/auth/login', data);
            login(res.data.token, res.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
                <h2 className="mb-6 text-center text-2xl font-bold text-gray-700">
                    Login
                </h2>

                {error && <p className="mb-4 text-center text-red-500">{error}</p>}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            {...register('email', { required: true })}
                            type="email"
                            className="text-black mt-1 block w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                        />
                        {errors.email && <span className="text-sm text-red-500">Email is required</span>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                            {...register('password', { required: true })}
                            type="password"
                            className="text-black mt-1 block w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                        />
                        {errors.password && <span className="text-sm text-red-500">Password is required</span>}
                    </div>

                    <div className="flex justify-end">
                        <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
                            Forgot Password?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <p className="mt-4 text-center text-sm">
                    Don't have an account? <Link href="/register" className="text-blue-600">Register</Link>
                </p>
            </div>
        </div>
    );
}
