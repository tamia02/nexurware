"use client";

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { ArrowLeft, ArrowRight, Clock, Mail, MessageSquare, MousePointer2, Send } from 'lucide-react';
import Link from 'next/link';
import { StepFunnel } from '@/components/analytics/StepFunnel';
import { LeadSidePanel } from '@/components/LeadSidePanel';

// Types
interface CampaignStats {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    replied: number;
    positives: number;
    meetings: number;
    bounced: number;
    openRate: number;
    replyRate: number;
    bounceRate: number;
}
interface Campaign {
    id: string;
    name: string;
    status: string;
    sequences: any[];
}

export default function CampaignDetailsPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const id = params?.id as string;
    const defaultFilter = searchParams?.get('filter') || 'All';

    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [stats, setStats] = useState<CampaignStats | null>(null);
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'leads' | 'sequences'>(defaultFilter !== 'All' ? 'leads' : 'sequences');
    const [leadFilter, setLeadFilter] = useState(defaultFilter);
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        let mounted = true;
        let interval: NodeJS.Timeout;
        const fetchData = (isInitial = false) => {
            if (isInitial) setLoading(true);
            Promise.all([
                api.get(`/campaigns/${id}`),
                api.get(`/analytics/campaigns/${id}`),
                api.get(`/campaigns/${id}/leads`)
            ]).then(([campRes, statsRes, leadsRes]) => {
                if (mounted) {
                    setCampaign(campRes.data);
                    setStats({ ...statsRes.data, ...campRes.data.stats });
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

    const filteredLeads = leads.filter(job => {
        if (leadFilter === 'All') return true;
        if (leadFilter === 'Opened') return job.opensCount > 0;
        if (leadFilter === 'Replied') return job.status === 'REPLIED' || job.lead?.classification === 'POSITIVE' || job.lead?.classification === 'MEETING';
        if (leadFilter === 'Positive') return job.lead?.classification === 'POSITIVE' || job.lead?.classification === 'MEETING';
        if (leadFilter === 'Meeting') return job.lead?.classification === 'MEETING';
        if (leadFilter === 'Bounced') return job.status === 'BOUNCED';
        if (leadFilter === 'No Activity') return job.opensCount === 0 && job.status !== 'REPLIED' && job.status !== 'BOUNCED';
        return true;
    });

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

                    <div className="flex gap-2">
                        <button
                            onClick={async () => {
                                if (!confirm("Create a new campaign targeting leads who haven't opened yet?")) return;
                                try {
                                    setLoading(true);
                                    const res = await api.post(`/campaigns/${id}/smart-resend`);
                                    alert("Campaign created!");
                                    window.location.href = `/campaigns/${res.data.id}`;
                                } catch (e) {
                                    alert("Failed to create resend campaign: " + String(e));
                                    setLoading(false);
                                }
                            }}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center"
                        >
                            <Mail className="w-4 h-4 mr-2" />
                            Resend to Non-Openers
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
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

            {/* Funnel Bar */}
            <div className="bg-white p-4 rounded-lg shadow border border-gray-100 mb-8 flex justify-between items-center text-sm font-medium overflow-x-auto whitespace-nowrap">
                <div className="text-gray-500 mr-2 flex-shrink-0">Delivered: <span className="text-gray-900">{stats?.delivered || 0}</span></div>
                <ArrowRight className="text-gray-300 w-4 h-4 mx-2 flex-shrink-0" />
                <div className="text-gray-500 mr-2 flex-shrink-0">Opened: <span className="text-gray-900">{stats?.opened || 0}</span></div>
                <ArrowRight className="text-gray-300 w-4 h-4 mx-2 flex-shrink-0" />
                <div className="text-gray-500 mr-2 flex-shrink-0">Replied: <span className="text-gray-900">{stats?.replied || 0}</span></div>
                <ArrowRight className="text-gray-300 w-4 h-4 mx-2 flex-shrink-0" />
                <div className="text-purple-600 mr-2 flex-shrink-0">Positive: <span className="font-bold">{stats?.positives || 0}</span></div>
                <ArrowRight className="text-gray-300 w-4 h-4 mx-2 flex-shrink-0" />
                <div className="text-orange-600 flex-shrink-0">Meetings: <span className="font-bold">{stats?.meetings || 0}</span></div>
                {(stats?.bounced ?? 0) > 0 && (
                    <div className="ml-auto text-red-500 flex-shrink-0 pl-4 border-l">Bounced: {stats?.bounced}</div>
                )}
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
                        {/* Funnel Visualization */}
                        <StepFunnel campaignId={id} />
                        <hr className="border-gray-200" />

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
                    <div className="space-y-4">
                        {/* Filters */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {['All', 'Opened', 'Replied', 'Positive', 'Meeting', 'Bounced', 'No Activity'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => setLeadFilter(f)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${leadFilter === f ? 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm' : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'} border`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                        <div className="overflow-x-auto border border-gray-200 rounded-md">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Classification</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Step</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opens</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredLeads.map((job) => (
                                        <tr key={job.id} onClick={() => setSelectedLeadId(job.leadId)} className="hover:bg-blue-50 cursor-pointer transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{job.lead?.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                    ${job.status === 'CONTACTED' ? 'bg-green-100 text-green-800' :
                                                        job.status === 'REPLIED' ? 'bg-blue-100 text-blue-800' :
                                                            job.status === 'BOUNCED' ? 'bg-red-100 text-red-800' :
                                                                job.status === 'NEW' ? 'bg-gray-100 text-gray-800' :
                                                                    'bg-red-100 text-red-800'}`}>
                                                    {job.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                {job.lead?.classification && (
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                        ${job.lead.classification === 'POSITIVE' ? 'bg-purple-100 text-purple-800' :
                                                            job.lead.classification === 'MEETING' ? 'bg-orange-100 text-orange-800' :
                                                                job.lead.classification === 'NEGATIVE' ? 'bg-red-100 text-red-800' :
                                                                    'bg-gray-100 text-gray-800'}`}>
                                                        {job.lead.classification}
                                                    </span>
                                                )}
                                                {!job.lead?.classification && <span className="text-gray-400">-</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                Step {job.currentStep + 1}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {job.opensCount > 0 ? <span className="text-green-600 font-medium">{job.opensCount}</span> : '0'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {job.lastActivityAt ? new Date(job.lastActivityAt).toLocaleString() : (job.nextActionAt ? new Date(job.nextActionAt).toLocaleString() : '-')}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredLeads.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500 border-dashed border-2 border-gray-100">
                                                No leads found for this filter.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Lead Side Panel */}
            {selectedLeadId && (
                <LeadSidePanel
                    campaignId={id}
                    leadId={selectedLeadId}
                    onClose={() => setSelectedLeadId(null)}
                />
            )}
        </div>
    );
}
