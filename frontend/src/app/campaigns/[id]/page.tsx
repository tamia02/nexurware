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
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'leads' | 'sequences'>('sequences');

    useEffect(() => {
        if (!id) return;

        let mounted = true;
        let interval: NodeJS.Timeout;
        setLoading(true);

        const fetchData = (isInitial = false) => {
            Promise.all([
                api.get(`/campaigns/${id}`),
                api.get(`/analytics/campaigns/${id}`),
                api.get(`/campaigns/${id}/leads`)
            ]).then(([campRes, statsRes, leadsRes]) => {
                if (mounted) {
                    setCampaign(campRes.data);
                    setStats(statsRes.data);
                    setLeads(leadsRes.data || []);
                    if (isInitial) setLoading(false);
                }
            })
                .catch((err) => {
                    console.error(err);
                    if (mounted && isInitial) setLoading(false);
                });
        };

        fetchData(true);

        if (activeTab === 'leads') {
            interval = setInterval(() => fetchData(false), 5000);
        }

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [id, activeTab]);

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
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Step</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {leads.map((job) => (
                                    <tr key={job.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{job.lead?.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${job.status === 'CONTACTED' ? 'bg-green-100 text-green-800' :
                                                    job.status === 'REPLIED' ? 'bg-blue-100 text-blue-800' :
                                                        job.status === 'NEW' ? 'bg-gray-100 text-gray-800' :
                                                            'bg-red-100 text-red-800'}`}>
                                                {job.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            Step {job.currentStep + 1}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {job.nextActionAt ? new Date(job.nextActionAt).toLocaleString() : '-'}
                                        </td>
                                    </tr>
                                ))}
                                {leads.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                                            No leads in this campaign yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
