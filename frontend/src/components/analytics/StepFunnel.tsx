"use client";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface StepStat {
    id: string;
    order: number;
    subject: string;
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
    openRate: number;
    replyRate: number;
}

export function StepFunnel({ campaignId }: { campaignId: string }) {
    const [stats, setStats] = useState<StepStat[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/campaigns/${campaignId}/analytics/steps`)
            .then(res => setStats(res.data))
            .finally(() => setLoading(false));
    }, [campaignId]);

    if (loading) return <div className="p-4 text-gray-500">Loading metrics...</div>;
    if (stats.length === 0) return <div className="p-4 text-gray-500">No step data available yet.</div>;

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold">Step Performance</h3>
            <div className="space-y-4">
                {stats.map((step, idx) => (
                    <div key={step.id} className="bg-white border rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-bold text-gray-800">
                                    Step {idx + 1}: {step.subject || '(No Subject)'}
                                </h4>
                                <div className="text-xs text-gray-500 mt-1">
                                    Sent: {step.sent}
                                </div>
                            </div>
                            <div className="text-right space-y-1">
                                <div className="text-sm font-medium text-blue-600">
                                    {step.openRate}% Open Rate
                                </div>
                                <div className="text-sm font-medium text-green-600">
                                    {step.replyRate}% Reply Rate
                                </div>
                            </div>
                        </div>

                        {/* Funnel Visual */}
                        <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden flex">
                            {/* Base is Sent (100% relative width for bar? No, represent drop off) 
                                Let's show bars relative to Sent count of THIS step.
                             */}
                            <div
                                className="h-full bg-blue-400"
                                style={{ width: `${step.openRate}%` }}
                                title={`${step.opened} Opened`}
                            />
                            <div
                                className="h-full bg-green-500"
                                style={{ width: `${step.replyRate}%` }} // Typically replying is subset of open, but visualized separately or stacked? 
                                // Let's just overlay or stack. Independent percentages is safer for visual width if replyRate is low.
                                title={`${step.replied} Replied`}
                            />
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>0%</span>
                            <span>50%</span>
                            <span>100%</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
