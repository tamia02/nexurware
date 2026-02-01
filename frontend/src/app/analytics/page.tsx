'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
// import { Card } from '@/components/ui/card'; // Check if we have ui/card? If not, use generic div
// Assuming no Shadcn UI setup yet, using generic divs.

export default function AnalyticsPage() {
    const [globalStats, setGlobalStats] = useState<any>(null);
    const [dailyStats, setDailyStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [globalRes, dailyRes] = await Promise.all([
                    api.get('/analytics/global'),
                    api.get('/analytics/daily')
                ]);
                setGlobalStats(globalRes.data);
                setDailyStats(dailyRes.data.reverse()); // Chart needs chronological order
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) return <div className="p-8">Loading stats...</div>;

    return (
        <div className="p-8 space-y-8">
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard title="Total Sent" value={globalStats?.totalSent || 0} />
                <StatCard title="Open Rate" value={`${globalStats?.openRate.toFixed(1)}%`} />
                <StatCard title="Reply Rate" value={`${globalStats?.replyRate.toFixed(1)}%`} />
                <StatCard title="Total Replies" value={globalStats?.totalReplied || 0} />
            </div>

            {/* Charts */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-6">Performance History (Last 30 Days)</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dailyStats}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            />
                            <YAxis />
                            <Tooltip labelFormatter={(label) => new Date(label).toLocaleDateString()} />
                            <Legend />
                            <Line type="monotone" dataKey="sent" stroke="#8884d8" name="Sent" />
                            <Line type="monotone" dataKey="opened" stroke="#82ca9d" name="Opened" />
                            <Line type="monotone" dataKey="replied" stroke="#ff7300" name="Replied" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value }: { title: string, value: string | number }) {
    return (
        <div className="bg-white p-6 rounded-lg shadow flex flex-col items-center justify-center">
            <h3 className="text-gray-500 text-sm font-medium uppercase">{title}</h3>
            <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
    );
}
