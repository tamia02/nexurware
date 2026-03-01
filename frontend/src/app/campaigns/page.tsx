"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Plus, Play, Pause, MoreVertical, FileText, Trash2 } from 'lucide-react';
import { api, fetcher } from '@/lib/api';

interface Campaign {
    id: string;
    name: string;
    status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
    _count: {
        leads: number;
    };
    stats?: {
        sent: number;
        opened: number;
        replied: number;
        openRate: number;
        replyRate: number;
    };
}

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useEffect(() => {
        fetcher('/campaigns')
            .then(setCampaigns)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(campaigns.map(c => c.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedIds.length} campaigns? This cannot be undone.`)) return;
        try {
            await api.post('/campaigns/bulk-delete', { ids: selectedIds });
            setCampaigns(prev => prev.filter(c => !selectedIds.includes(c.id)));
            setSelectedIds([]);
        } catch (err) {
            console.error(err);
            alert('Failed to delete campaigns');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Campaigns</h2>
                <div className="flex gap-2">
                    {selectedIds.length > 0 && (
                        <Button variant="danger" onClick={handleBulkDelete}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete ({selectedIds.length})
                        </Button>
                    )}
                    <Link href="/campaigns/new">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            New Campaign
                        </Button>
                    </Link>
                </div>
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : campaigns.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-500">No campaigns found. Create your first one!</p>
                </div>
            ) : (
                <div className="bg-white shadow rounded-md overflow-hidden border border-gray-200">
                    <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center">
                        <input
                            type="checkbox"
                            className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                            checked={campaigns.length > 0 && selectedIds.length === campaigns.length}
                            onChange={handleSelectAll}
                        />
                        <span className="ml-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Select All</span>
                    </div>
                    <ul role="list" className="divide-y divide-gray-200">
                        {campaigns.map((campaign) => (
                            <li key={campaign.id} className={`hover:bg-gray-50 flex items-center ${selectedIds.includes(campaign.id) ? 'bg-blue-50' : ''}`}>
                                <div className="pl-6">
                                    <input
                                        type="checkbox"
                                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                                        checked={selectedIds.includes(campaign.id)}
                                        onChange={() => handleSelectOne(campaign.id)}
                                    />
                                </div>
                                <Link href={`/campaigns/${campaign.id}`} className="block flex-1 px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-full ${campaign.status === 'ACTIVE' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                                                {campaign.status === 'ACTIVE' ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-blue-600 truncate">{campaign.name}</p>
                                                <div className="flex items-center text-xs text-gray-500 gap-3 mt-1">
                                                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {campaign.status}</span>
                                                    <span className="text-gray-300">|</span>
                                                    <span>{campaign._count.leads} Leads</span>
                                                    {campaign.stats && (
                                                        <>
                                                            <span className="text-gray-300">|</span>
                                                            <span className="font-medium text-gray-800">{campaign.stats.sent} Sent</span>
                                                            <span className="text-gray-300">|</span>
                                                            <span className="text-green-600 font-semibold">{campaign.stats.openRate}% Open</span>
                                                            <span className="text-gray-300">|</span>
                                                            <span className="text-blue-600 font-semibold">{campaign.stats.replyRate}% Reply</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center text-gray-400 gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (!confirm("Delete this campaign? This cannot be undone.")) return;
                                                    api.delete(`/campaigns/${campaign.id}`)
                                                        .then(() => setCampaigns(prev => prev.filter(c => c.id !== campaign.id)))
                                                        .catch(err => alert("Failed to delete"));
                                                }}
                                                className="p-2 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors"
                                                title="Delete Campaign"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
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
