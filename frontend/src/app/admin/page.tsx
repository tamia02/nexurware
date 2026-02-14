
"use client";

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function AdminPage() {
    const [secret, setSecret] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchWorkspaces = (token: string) => {
        setLoading(true);
        setError('');
        api.get('/admin/workspaces', { headers: { 'x-admin-secret': token } })
            .then(res => {
                setWorkspaces(res.data);
                setIsAuthenticated(true);
                localStorage.setItem('admin_secret', token);
            })
            .catch(err => {
                console.error(err);
                setError('Invalid Secret or Server Error');
                setIsAuthenticated(false);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        const savedSecret = localStorage.getItem('admin_secret');
        if (savedSecret) {
            setSecret(savedSecret);
            fetchWorkspaces(savedSecret);
        }
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        fetchWorkspaces(secret);
    };

    const updatePlan = (id: string, action: 'upgrade' | 'downgrade') => {
        if (!confirm(`Are you sure you want to ${action} this workspace?`)) return;

        api.post(`/admin/workspaces/${id}/${action}`, {}, { headers: { 'x-admin-secret': secret } })
            .then(res => {
                // Refresh list
                const updated = workspaces.map(w => w.id === id ? { ...w, plan: res.data.plan } : w);
                setWorkspaces(updated);
            })
            .catch(err => alert('Failed to update plan'));
    };

    const handleLogout = () => {
        localStorage.removeItem('admin_secret');
        setSecret('');
        setIsAuthenticated(false);
        setWorkspaces([]);
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Admin Login</h2>
                    <p className="mt-2 text-center text-sm text-gray-600">Enter Admin Secret Code</p>
                </div>
                <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                        <form className="space-y-6" onSubmit={handleLogin}>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Secret Code</label>
                                <div className="mt-1">
                                    <input
                                        type="password"
                                        required
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        value={secret}
                                        onChange={(e) => setSecret(e.target.value)}
                                    />
                                </div>
                            </div>
                            {error && <div className="text-red-600 text-sm">{error}</div>}
                            <div>
                                <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                    Access Dashboard
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Admin Panel (God Mode)</h1>
                    <button onClick={handleLogout} className="text-gray-600 hover:text-gray-900">Logout</button>
                </div>

                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <div className="px-4 py-5 sm:px-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">Workspaces</h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">Manage plans and limits.</p>
                    </div>
                    <div className="border-t border-gray-200">
                        <ul className="divide-y divide-gray-200">
                            {workspaces.map((ws) => (
                                <li key={ws.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-indigo-600 truncate">{ws.name}</p>
                                            <p className="text-sm text-gray-500">
                                                ID: {ws.id} | Users: {ws._count?.users} | Created: {new Date(ws.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ws.plan === 'PRO' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {ws.plan}
                                            </span>
                                            {ws.plan !== 'PRO' ? (
                                                <button
                                                    onClick={() => updatePlan(ws.id, 'upgrade')}
                                                    className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                                                >
                                                    Upgrade to PRO
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => updatePlan(ws.id, 'downgrade')}
                                                    className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200"
                                                >
                                                    Downgrade to FREE
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
