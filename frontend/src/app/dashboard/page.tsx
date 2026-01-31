"use client";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ArrowUpRight, CheckCircle2, Circle, Mail, MousePointer2, Send } from 'lucide-react';
import Link from 'next/link';

interface Stats {
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
    openRate: number;
    replyRate: number;
    clickRate?: number;
}

interface OnboardingStatus {
    hasMailbox: boolean;
    hasLeads: boolean;
    hasCampaign: boolean;
    completed: boolean;
}

export default function DashboardPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, onboardingRes] = await Promise.all([
                    api.get('/analytics/global'),
                    api.get('/onboarding')
                ]);
                setStats(statsRes.data);
                setOnboarding(onboardingRes.data);

                // Redirect to wizard if not completed
                if (!onboardingRes.data.completed) {
                    window.location.href = '/onboarding';
                }

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div>Loading...</div>;

    const cards = [
        { name: 'Emails Sent', value: stats?.sent || 0, icon: Send, change: '+12%', changeType: 'increase' },
        { name: 'Open Rate', value: `${(stats?.openRate || 0).toFixed(1)}%`, icon: Mail, change: '+2.1%', changeType: 'increase' },
        { name: 'Reply Rate', value: `${(stats?.replyRate || 0).toFixed(1)}%`, icon: ArrowUpRight, change: '+0.5%', changeType: 'increase' },
        { name: 'Click Rate', value: `${((stats?.clicked || 0) / (stats?.sent || 1) * 100).toFixed(1)}%`, icon: MousePointer2, change: '0%', changeType: 'neutral' },
    ];

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

            {/* Onboarding Checklist */}
            {onboarding && !onboarding.completed && (
                <div className="bg-white rounded-lg shadow p-6 mb-8 border-l-4 border-blue-500">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Getting Started</h2>
                    <div className="space-y-3">
                        <div className="flex items-center">
                            {onboarding.hasMailbox ? <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" /> : <Circle className="w-5 h-5 text-gray-300 mr-2" />}
                            <Link href="/settings" className={`text-sm ${onboarding.hasMailbox ? 'text-gray-500 line-through' : 'text-blue-600 font-medium hover:underline'}`}>
                                Connect your sending mailbox
                            </Link>
                        </div>
                        <div className="flex items-center">
                            {onboarding.hasLeads ? <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" /> : <Circle className="w-5 h-5 text-gray-300 mr-2" />}
                            <Link href="/leads" className={`text-sm ${onboarding.hasLeads ? 'text-gray-500 line-through' : 'text-blue-600 font-medium hover:underline'}`}>
                                Import your first list of leads
                            </Link>
                        </div>
                        <div className="flex items-center">
                            {onboarding.hasCampaign ? <CheckCircle2 className="w-5 h-5 text-green-500 mr-2" /> : <Circle className="w-5 h-5 text-gray-300 mr-2" />}
                            <Link href="/campaigns/new" className={`text-sm ${onboarding.hasCampaign ? 'text-gray-500 line-through' : 'text-blue-600 font-medium hover:underline'}`}>
                                Create and launch a campaign
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((card) => (
                    <div key={card.name} className="relative overflow-hidden rounded-lg bg-white px-4 pt-5 pb-12 shadow sm:px-6 sm:pt-6">
                        <dt>
                            <div className="absolute rounded-md bg-blue-500 p-3">
                                <card.icon className="h-6 w-6 text-white" aria-hidden="true" />
                            </div>
                            <p className="ml-16 truncate text-sm font-medium text-gray-500">{card.name}</p>
                        </dt>
                        <dd className="ml-16 flex items-baseline pb-1 sm:pb-7">
                            <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
                            <p className={`ml-2 flex items-baseline text-sm font-semibold ${card.changeType === 'increase' ? 'text-green-600' : 'text-gray-500'
                                }`}>
                                {card.change}
                            </p>
                        </dd>
                    </div>
                ))}
            </div>
        </div>
    );
}
