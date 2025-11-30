"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

interface Stats {
    totalUsers: number;
    totalPosts: number;
    totalComments: number;
    totalStudents: number;
    totalPublicUsers: number;
}

export default function AdminPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        if (!loading && (!user || !user.isAdmin)) {
            router.push("/");
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user?.isAdmin) {
            fetchStats();
        }
    }, [user]);

    const fetchStats = async () => {
        try {
            const response = await api.get("/admin/stats");
            setStats(response.data);
        } catch (error) {
            console.error("Failed to fetch stats:", error);
        } finally {
            setLoadingStats(false);
        }
    };

    if (loading || !user?.isAdmin) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

                {/* Stats Cards */}
                {loadingStats ? (
                    <div className="text-center py-8">Loading statistics...</div>
                ) : stats ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
                            <p className="text-3xl font-bold text-indigo-600">{stats.totalUsers}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-sm font-medium text-gray-500">Total Posts</h3>
                            <p className="text-3xl font-bold text-green-600">{stats.totalPosts}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-sm font-medium text-gray-500">Total Comments</h3>
                            <p className="text-3xl font-bold text-blue-600">{stats.totalComments}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-sm font-medium text-gray-500">Student Users</h3>
                            <p className="text-3xl font-bold text-purple-600">{stats.totalStudents}</p>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-sm font-medium text-gray-500">Public Users</h3>
                            <p className="text-3xl font-bold text-orange-600">{stats.totalPublicUsers}</p>
                        </div>
                    </div>
                ) : null}

                {/* Management Links */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Link
                        href="/admin/users"
                        className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 block"
                    >
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">User Management</h2>
                        <p className="text-gray-600">View, edit, and manage all users</p>
                    </Link>
                    <Link
                        href="/admin/posts"
                        className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 block"
                    >
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Post Management</h2>
                        <p className="text-gray-600">Moderate and delete posts</p>
                    </Link>
                    <Link
                        href="/admin/comments"
                        className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 block"
                    >
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Comment Management</h2>
                        <p className="text-gray-600">Moderate and delete comments</p>
                    </Link>
                </div>
            </div>
        </div>
    );
}
