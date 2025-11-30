"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import api from "@/lib/api";

interface User {
    _id: string;
    name: string;
    hashedEmail: string | null;
    isStudent: boolean;
    isAdmin: boolean;
    university: string;
    createdAt: string;
}

export default function UserManagementPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState("");

    useEffect(() => {
        if (!loading && (!user || !user.isAdmin)) {
            router.push("/");
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user?.isAdmin) {
            fetchUsers();
        }
    }, [user]);

    const fetchUsers = async () => {
        try {
            const response = await api.get("/admin/users");
            setUsers(response.data.users);
        } catch (error) {
            console.error("Failed to fetch users:", error);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleUpdatePassword = async (userId: string) => {
        if (!newPassword) {
            alert("Please enter a new password");
            return;
        }

        if (!confirm("Are you sure you want to update this user's password?")) {
            return;
        }

        try {
            await api.put(`/admin/users/${userId}/password`, { newPassword });
            alert("Password updated successfully");
            setNewPassword("");
            setSelectedUser(null);
        } catch (error: any) {
            alert(error.response?.data?.message || "Failed to update password");
        }
    };

    const handleDeleteUser = async (userId: string, userName: string) => {
        if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
            return;
        }

        const cascadeDelete = confirm(
            "Do you also want to delete all posts and comments from this user?"
        );

        try {
            await api.delete(`/admin/users/${userId}?cascade=${cascadeDelete}`);
            alert("User deleted successfully");
            fetchUsers();
        } catch (error: any) {
            alert(error.response?.data?.message || "Failed to delete user");
        }
    };

    if (loading || !user?.isAdmin) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">User Management</h1>

                {loadingUsers ? (
                    <div className="text-center py-8">Loading users...</div>
                ) : (
                    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">University</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map((u) => (
                                    <tr key={u._id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {u.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {u.isStudent ? "Student" : "Public"}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {u.university}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {u.isAdmin ? (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                                    Admin
                                                </span>
                                            ) : (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                    User
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                            {selectedUser === u._id ? (
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="password"
                                                        placeholder="New password"
                                                        value={newPassword}
                                                        onChange={(e) => setNewPassword(e.target.value)}
                                                        className="border rounded px-2 py-1 text-sm"
                                                    />
                                                    <button
                                                        onClick={() => handleUpdatePassword(u._id)}
                                                        className="text-green-600 hover:text-green-900"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedUser(null);
                                                            setNewPassword("");
                                                        }}
                                                        className="text-gray-600 hover:text-gray-900"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => setSelectedUser(u._id)}
                                                        className="text-indigo-600 hover:text-indigo-900"
                                                    >
                                                        Change Password
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(u._id, u.name)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        Delete
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
