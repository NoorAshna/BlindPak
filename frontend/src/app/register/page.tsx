"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
    const { register, handleSubmit, watch, formState: { errors } } = useForm();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const onSubmit = async (data: any) => {
        setLoading(true);
        setError('');
        try {
            if (data.password !== data.confirmPassword) {
                setError("Passwords do not match");
                setLoading(false);
                return;
            }

            await api.post('/auth/register/initiate', {
                email: data.email,
                password: data.password
            });

            router.push(`/verify?email=${encodeURIComponent(data.email)}`);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
                <h2 className="mb-6 text-center text-2xl font-bold text-gray-700">
                    Create Account
                </h2>

                {error && <p className="mb-4 text-center text-red-500">{error}</p>}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            {...register('email', { required: true })}
                            type="email"
                            className="text-black mt-1 block w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                            placeholder="email@example.com"
                        />
                        {errors.email && <span className="text-sm text-red-500">Email is required</span>}
                        <p className="mt-1 text-xs text-gray-500">Use your university email for student access.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                            {...register('password', { required: true, minLength: 6 })}
                            type="password"
                            className="text-black mt-1 block w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                        />
                        {errors.password && <span className="text-sm text-red-500">Password must be at least 6 chars</span>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                        <input
                            {...register('confirmPassword', { required: true })}
                            type="password"
                            className="text-black mt-1 block w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                        />
                        {errors.confirmPassword && <span className="text-sm text-red-500">Please confirm your password</span>}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : 'Register'}
                    </button>
                </form>

                <p className="mt-4 text-center text-sm">
                    Already have an account? <Link href="/login" className="text-blue-600">Login</Link>
                </p>
            </div>
        </div>
    );
}
