"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { ArrowLeft, Clock, Mail, MessageSquare, MousePointer2, Send } from 'lucide-react';
import Link from 'next/link';

// Types
interface CampaignStats {
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
    openRate: number;
    replyRate: number;
}
interface Campaign {
    id: string;
    name: string;
    status: string;
    sequences: any[];
}

export default function CampaignDetailsPage() {
    const params = useParams();
    const id = params?.id as string;

    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [stats, setStats] = useState<CampaignStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'leads' | 'sequences'>('sequences');

    useEffect(() => {
        if (!id) return;

        let mounted = true;
        setLoading(true);

        Promise.all([
            api.get(`/campaigns/${id}`),
            api.get(`/analytics/campaigns/${id}`)
        ]).then(([campRes, statsRes]) => {
            if (mounted) {
                setCampaign(campRes.data);
                setStats(statsRes.data);
            }
        })
            .catch(console.error)
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => { mounted = false; };
    }, [id]);

    if (loading) return <div>Loading...</div>;
    if (!campaign) return <div>Campaign not found</div>;

    const kpis = [
        { name: 'Sent', value: stats?.sent, icon: Send },
        { name: 'Open Rate', value: `${stats?.openRate.toFixed(1)}%`, icon: Mail },
        { name: 'Reply Rate', value: `${stats?.replyRate.toFixed(1)}%`, icon: MessageSquare },
        { name: 'Clicked', value: stats?.clicked, icon: MousePointer2 },
    ];

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <Link href="/campaigns" className="text-gray-500 hover:text-gray-700 text-sm flex items-center mb-2">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Campaigns
                </Link>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
                        <span className={`inline-flex mt-2 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${campaign.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                            {campaign.status}
                        </span>
                    </div>
                    {/* Actions like Pause/Resume could go here */}
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {kpis.map((stat, i) => (
                    <div key={i} className="bg-white p-4 rounded-lg shadow border border-gray-100 flex items-center">
                        <div className="p-3 rounded-full bg-blue-50 text-blue-600 mr-4">
                            <stat.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                            <p className="text-xl font-bold text-gray-900">{stat.value || 0}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('sequences')}
                        className={`${activeTab === 'sequences' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Sequences
                    </button>
                    <button
                        onClick={() => setActiveTab('leads')}
                        className={`${activeTab === 'leads' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Leads (Target List)
                    </button>
                </nav>
            </div>

            {/* Content */}
            <div className="bg-white rounded-lg shadow p-6">
                {activeTab === 'sequences' && (
                    <div className="space-y-8">
                        {campaign.sequences.map((step, idx) => (
                            <div key={step.id} className="relative pl-8 border-l-2 border-gray-200 pb-8 last:pb-0 last:border-0">
                                <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-white" />
                                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                                    <div className="flex justify-between mb-2">
                                        <h3 className="text-sm font-bold text-gray-900">Step {idx + 1}: Email</h3>
                                        <div className="flex items-center text-xs text-gray-500">
                                            <Clock className="w-3 h-3 mr-1" />
                                            Delay: {step.delayDays}d {step.delayHours}h
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-800 font-medium mb-1">Subject: {step.subject}</p>
                                    <p className="text-sm text-gray-600 font-mono bg-white p-2 rounded border">
                                        {step.body}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {campaign.sequences.length === 0 && <p className="text-gray-500">No sequences defined.</p>}
                    </div>
                )}

                {activeTab === 'leads' && (
                    <div className="text-center py-10 text-gray-500">
                        {/* 
                           TODO: We need an endpoint to get leads FOR A CAMPAIGN with their status
                           For now, this is a placeholder. 
                        */}
                        <p>Lead List View integration coming soon.</p>
                        <p className="text-xs mt-2">Use the global leads page for now.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
