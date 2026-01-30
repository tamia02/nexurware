"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetcher } from '@/lib/api';
import { Button } from '@/components/Button';
import { Plus, Play, Pause, MoreVertical, FileText } from 'lucide-react';

interface Campaign {
    id: string;
    name: string;
    status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
    _count: {
        leads: number;
    };
}

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetcher('/campaigns')
            .then(setCampaigns)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Campaigns</h2>
                <Link href="/campaigns/new">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        New Campaign
                    </Button>
                </Link>
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : campaigns.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-500">No campaigns found. Create your first one!</p>
                </div>
            ) : (
                <div className="bg-white shadow rounded-md overflow-hidden">
                    <ul role="list" className="divide-y divide-gray-200">
                        {campaigns.map((campaign) => (
                            <li key={campaign.id} className="hover:bg-gray-50">
                                <Link href={`/campaigns/${campaign.id}`} className="block px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-full ${campaign.status === 'ACTIVE' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                                                {campaign.status === 'ACTIVE' ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-blue-600 truncate">{campaign.name}</p>
                                                <p className="flex items-center text-sm text-gray-500 gap-2 mt-1">
                                                    <FileText className="w-3 h-3" />
                                                    {campaign.status}
                                                    <span className="text-gray-300">•</span>
                                                    {campaign._count.leads} leads
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center text-gray-400">
                                            <MoreVertical className="w-5 h-5" />
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
