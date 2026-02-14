import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/Button';
import { Mail, Users, Send, BarChart2, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await api.post('/auth/login', { email, password });
            login(res.data.token, res.data.user);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { icon: Mail, title: "Connect Mailbox", desc: "Link your email accounts via SMTP/IMAP." },
        { icon: Users, title: "Import Leads", desc: "Upload CSVs to build your targeted audience." },
        { icon: Send, title: "Create Campaign", desc: "Set up sequences with smart follow-ups." },
        { icon: BarChart2, title: "Launch & Track", desc: "Monitor opens, clicks, and replies in real-time." }
    ];

    return (
        <div className="flex min-h-screen bg-white">
            {/* Login Section */}
            <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
                <div className="mx-auto w-full max-w-sm lg:w-96">
                    <div>
                        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Sign in to Nexusware</h2>
                        <p className="mt-2 text-sm text-gray-600">
                            Or{' '}
                            <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
                                start your 14-day free trial
                            </Link>
                        </p>
                    </div>

                    <div className="mt-8">
                        <div className="mt-6">
                            <form action="#" method="POST" className="space-y-6" onSubmit={handleSubmit}>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                        Email address
                                    </label>
                                    <div className="mt-1">
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                        Password
                                    </label>
                                    <div className="mt-1">
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            autoComplete="current-password"
                                            required
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                    </div>
                                </div>

                                {error && <div className="text-red-500 text-sm">{error}</div>}

                                <div>
                                    <Button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" disabled={loading}>
                                        {loading ? 'Signing in...' : 'Sign in'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Manual/Guide Section */}
            <div className="hidden lg:block relative w-0 flex-1 bg-gray-50">
                <div className="absolute inset-0 h-full w-full object-cover">
                    <div className="flex h-full flex-col justify-center px-20">
                        <div className="max-w-lg">
                            <h2 className="text-3xl font-bold text-gray-900 mb-8">How it Works</h2>
                            <div className="space-y-8">
                                {steps.map((step, idx) => (
                                    <div key={idx} className="flex">
                                        <div className="flex-shrink-0">
                                            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                                                <step.icon className="h-6 w-6" aria-hidden="true" />
                                            </div>
                                        </div>
                                        <div className="ml-4">
                                            <h3 className="text-lg leading-6 font-medium text-gray-900">{step.title}</h3>
                                            <p className="mt-1 text-base text-gray-500">{step.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
