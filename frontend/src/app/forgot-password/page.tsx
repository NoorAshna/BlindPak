"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const { register, handleSubmit, watch, formState: { errors } } = useForm();
    const router = useRouter();
    const [step, setStep] = useState(1); // 1: Email, 2: OTP & New Password
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [email, setEmail] = useState('');

    const onSendOtp = async (data: any) => {
        setLoading(true);
        setError('');
        try {
            await api.post('/auth/forgot-password', { email: data.email });
            setEmail(data.email);
            setStep(2);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const onResetPassword = async (data: any) => {
        setLoading(true);
        setError('');
        try {
            if (data.newPassword !== data.confirmPassword) {
                setError("Passwords do not match");
                return;
            }

            await api.post('/auth/reset-password', {
                email,
                otp: data.otp,
                newPassword: data.newPassword
            });

            router.push('/login');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
                <h2 className="mb-6 text-center text-2xl font-bold text-gray-700">
                    {step === 1 ? 'Forgot Password' : 'Reset Password'}
                </h2>

                {error && <p className="mb-4 text-center text-red-500">{error}</p>}

                {step === 1 ? (
                    <form onSubmit={handleSubmit(onSendOtp)} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                                {...register('email', { required: true })}
                                type="email"
                                className="text-black  mt-1 block w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                            />
                            {errors.email && <span className="text-sm text-red-500">Email is required</span>}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Sending OTP...' : 'Send OTP'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleSubmit(onResetPassword)} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">OTP Code</label>
                            <input
                                {...register('otp', { required: true })}
                                type="text"
                                className="text-black mt-1 block w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                            />
                            {errors.otp && <span className="text-sm text-red-500">OTP is required</span>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">New Password</label>
                            <input
                                {...register('newPassword', { required: true, minLength: 6 })}
                                type="password"
                                className="text-black mt-1 block w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
                            />
                            {errors.newPassword && <span className="text-sm text-red-500">Password must be at least 6 chars</span>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
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
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}

                <p className="mt-4 text-center text-sm">
                    Remember your password? <Link href="/login" className="text-blue-600">Login</Link>
                </p>
            </div>
        </div>
    );
}
