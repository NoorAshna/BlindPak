"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [isStudent, setIsStudent] = useState(true);
    const { register, handleSubmit, formState: { errors } } = useForm();
    const { login } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const onSubmit = async (data: any) => {
        setLoading(true);
        setError('');
        try {
            if (isStudent) {
                // Send OTP
                await api.post('/auth/student/send-otp', { email: data.email });
                // Redirect to verify page with email
                router.push(`/verify?email=${encodeURIComponent(data.email)}`);
            } else {
                // Public Login
                const res = await api.post('/auth/login', data);
                login(res.data.token, res.data);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
                <h2 className="mb-6 text-center text-2xl font-bold">
                    {isStudent ? 'Student Login' : 'Public Login'}
                </h2>

                <div className="mb-6 flex justify-center space-x-4">
                    <button
                        className={`rounded px-4 py-2 ${isStudent ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                        onClick={() => setIsStudent(true)}
                    >
                        Student
                    </button>
                    <button
                        className={`rounded px-4 py-2 ${!isStudent ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                        onClick={() => setIsStudent(false)}
                    >
                        Public
                    </button>
                </div>

                {error && <p className="mb-4 text-center text-red-500">{error}</p>}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input
                            {...register('email', { required: true })}
                            type="email"
                            className="mt-1 block w-full text-gray-700 rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                        />
                        {errors.email && <span className="text-sm text-red-500">Email is required</span>}
                    </div>

                    {!isStudent && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Password</label>
                            <input
                                {...register('password', { required: true })}
                                type="password"
                                className="mt-1 block w-full text-gray-700 rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                            />
                            {errors.password && <span className="text-sm text-red-500">Password is required</span>}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : (isStudent ? 'Send OTP' : 'Login')}
                    </button>
                </form>

                {!isStudent && (
                    <p className="mt-4 text-center text-sm">
                        Don't have an account? <Link href="/register" className="text-blue-600">Register</Link>
                    </p>
                )}
            </div>
        </div>
    );
}
