"use client";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/Button';
import { Check, Zap } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

interface Workspace {
    id: string;
    subscriptionStatus: string;
    plan: string;
}

export default function BillingPage() {
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [loading, setLoading] = useState(true);
    const [upgrading, setUpgrading] = useState(false);
    const searchParams = useSearchParams();
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    useEffect(() => {
        fetchWorkspace();
    }, []);

    const fetchWorkspace = async () => {
        try {
            const res = await api.get('/api/workspace');
            setWorkspace(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpgrade = async () => {
        setUpgrading(true);
        try {
            const res = await api.post('/api/workspace/checkout');
            if (res.data.url) {
                window.location.href = res.data.url;
            }
        } catch (err) {
            console.error(err);
            alert('Failed to start checkout');
            setUpgrading(false);
        }
    };

    const handleDevUpgrade = async () => {
        if (!confirm('This is a dev-only tool. Upgrade for free?')) return;
        try {
            await api.post('/api/workspace/dev-upgrade');
            fetchWorkspace();
        } catch (err) {
            console.error(err);
        }
    }

    if (loading) return <div>Loading billing info...</div>;

    const isPro = workspace?.plan === 'PRO';

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Billing & Plans</h1>

            {success && (
                <div className="mb-8 bg-green-50 border-l-4 border-green-400 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <Check className="h-5 w-5 text-green-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-green-700">
                                Upgrade successful! You now have access to Pro features.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {canceled && (
                <div className="mb-8 bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <p className="text-sm text-yellow-700">
                        Checkout canceled. You were not charged.
                    </p>
                </div>
            )}

            <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
                <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Current Subscription</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                        Manage your workspace plan and billing details.
                    </p>
                </div>
                <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                    <dl className="sm:divide-y sm:divide-gray-200">
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Plan</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isPro ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {workspace?.plan}
                                </span>
                            </dd>
                        </div>
                        <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Status</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 capitalize">
                                {workspace?.subscriptionStatus}
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>

            {!isPro ? (
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                    <div className="px-6 py-8 bg-white sm:p-10 sm:pb-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="inline-flex px-4 py-1 rounded-full text-sm font-semibold tracking-wide uppercase bg-purple-100 text-purple-600">
                                    Pro Plan
                                </h3>
                            </div>
                            <div className="mt-4 flex items-baseline text-6xl font-extrabold tracking-tight text-gray-900 sm:mt-0 sm:ml-4">
                                $29
                                <span className="ml-1 text-2xl font-medium text-gray-500">/mo</span>
                            </div>
                        </div>
                        <div className="mt-4 text-lg text-gray-500">
                            Unlock the full power of the Cold Email CRM.
                        </div>
                    </div>
                    <div className="flex flex-col justify-between space-y-4 sm:flex-row sm:space-y-0 sm:space-x-6 px-6 pt-6 pb-8 bg-gray-50 sm:px-10">
                        <ul className="space-y-4">
                            <li className="flex items-start">
                                <div className="flex-shrink-0">
                                    <Check className="h-6 w-6 text-green-500" aria-hidden="true" />
                                </div>
                                <p className="ml-3 text-base text-gray-700">Unlimited Mailboxes</p>
                            </li>
                            <li className="flex items-start">
                                <div className="flex-shrink-0">
                                    <Check className="h-6 w-6 text-green-500" aria-hidden="true" />
                                </div>
                                <p className="ml-3 text-base text-gray-700">Unlimited Emails per day</p>
                            </li>
                            <li className="flex items-start">
                                <div className="flex-shrink-0">
                                    <Check className="h-6 w-6 text-green-500" aria-hidden="true" />
                                </div>
                                <p className="ml-3 text-base text-gray-700">Priority Support</p>
                            </li>
                        </ul>
                        <div className="pt-6 sm:pt-0 flex flex-col gap-2">
                            <Button onClick={handleUpgrade} disabled={upgrading} className="w-full flex items-center justify-center px-5 py-3 text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700">
                                {upgrading ? 'Processing...' : 'Upgrade with Stripe'}
                                <Zap className="ml-2 -mr-1 h-5 w-5" aria-hidden="true" />
                            </Button>

                            {/* Dev Only Shortcut */}
                            <button onClick={handleDevUpgrade} className="text-xs text-gray-400 hover:text-gray-600 underline">
                                Dev: Force Upgrade (Free)
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-purple-50 rounded-lg p-6 border border-purple-100">
                    <div className="flex items-center">
                        <Zap className="h-8 w-8 text-purple-600 mr-4" />
                        <div>
                            <h3 className="text-lg font-medium text-purple-900">You are on the Pro Plan!</h3>
                            <p className="text-purple-700 mt-1">
                                Enjoy unlimited sending and mailboxes. Manage your billing details in the Stripe Portal.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
