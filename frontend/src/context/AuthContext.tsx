"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface User {
    id: string;
    email: string;
    name: string;
    workspaceId: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (token: string, user: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    login: () => { },
    logout: () => { },
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const logout = () => {
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
        router.push('/login');
    };

    useEffect(() => {
        // Check localStorage for token
        const token = localStorage.getItem('token');
        if (token) {
            // Verify token / fetch user
            // Ideally we call /auth/me, but for now we trust the stored user if available or decode token
            // Let's call /auth/me to be safe
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            api.get('/auth/me')
                .then(res => {
                    setUser(res.data.user);
                })
                .catch((err) => {
                    console.error('Auth Check Failed:', err);
                    logout();
                })
                .finally(() => setLoading(false));
        } else {
            setTimeout(() => setLoading(false), 0);
        }
    }, []);

    const login = (token: string, userData: User) => {
        localStorage.setItem('token', token);
        // Set axios default
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(userData);
        router.push('/dashboard');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
