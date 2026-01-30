"use client";

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/context/AuthContext';

export const Shell = ({ children }: { children: React.ReactNode }) => {
    const pathname = usePathname();
    const { user, loading } = useAuth();
    const isAuthPage = pathname === '/login' || pathname === '/register';

    if (loading) return <div className="h-full flex items-center justify-center">Loading...</div>;

    if (isAuthPage) {
        return <div className="h-full bg-white">{children}</div>;
    }

    if (!user) {
        // If not loading, not auth page, and not user, AuthContext will redirect.
        // But we render nothing or children (which might be the redirecting component)
        return null;
    }

    return (
        <div className="h-full">
            <Sidebar />
            <main className="pl-64 h-full">
                <div className="py-10 px-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
