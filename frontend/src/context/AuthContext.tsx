"use client";

import { createContext, useState, useEffect, useContext } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

export type UserRole = 'admin' | 'student' | 'public';

export interface User {
    _id: string;
    name: string;
    role: UserRole;
    university?: string;
    bio?: string | null;
    token: string;
}

interface AuthContextType {
    user: User | null;
    login: (token: string, userData: any) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (token && userData) {
            setUser(JSON.parse(userData));
        }
        setLoading(false);
    }, []);

    const login = (token: string, userData: any) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({ ...userData, token }));
        setUser({ ...userData, token });
        router.push('/');
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    // Re-fetch the user from the server to keep data fresh (e.g. after bio update)
    const refreshUser = async () => {
        try {
            const res = await api.get('/auth/me');
            const token = localStorage.getItem('token') || '';
            const updated = { ...res.data, token };
            localStorage.setItem('user', JSON.stringify(updated));
            setUser(updated);
        } catch {
            // If token expired etc., logout
            logout();
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, refreshUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
