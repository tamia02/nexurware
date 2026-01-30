"use client";

import { useState } from 'react';
import { Button } from '@/components/Button';
import { api } from '@/lib/api';
import { Send, CheckCircle } from 'lucide-react';

export default function CreateCampaignStep({ onNext, defaultCompleted }: { onNext: () => void, defaultCompleted?: boolean }) {
    const [name, setName] = useState('My First Campaign');
    const [subject, setSubject] = useState('Quick Question');
    const [body, setBody] = useState('Hi {{firstName}},\n\nI noticed your work and wanted to connect.\n\nBest,\n[Your Name]');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(defaultCompleted || false);

    if (success) {
        return (
            <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-medium mb-4">Campaign Created!</h3>
                <p className="text-gray-500 mb-6">You&apos;re all set up.</p>
                <Button onClick={onNext} className="w-full">Go to Dashboard</Button>
            </div>
        );
    }

    const handleCreate = async () => {
        setLoading(true);
        try {
            // Create Campaign
            const res = await api.post('/api/campaigns', { name });
            const campaignId = res.data.id;

            // Add Step 1 (Email)
            await api.post(`/api/campaigns/${campaignId}/sequences`, {
                order: 1,
                type: 'EMAIL',
                subject,
                body,
                delayDays: 0
            });

            // Launch? Or just leave as draft. Let's leave as Draft for safety.
            setSuccess(true);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <Send className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                <h3 className="text-lg font-medium">Draft your first email</h3>
                <p className="text-sm text-gray-500">Create a campaign.</p>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Campaign Name</label>
                    <input
                        type="text"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Subject Line</label>
                    <input
                        type="text"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                    />
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">Email Body</label>
                        <button
                            type="button"
                            onClick={() => {
                                setSubject('Quick question about {{company}}');
                                setBody('Hi {{firstName}},\n\nI came across {{company}} and was really impressed by your recent work.\n\nI help businesses like yours streamline their workflow. Would you be open to a brief 15-minute chat next week?\n\nBest,\n[Your Name]');
                            }}
                            className="text-xs text-blue-600 hover:underline"
                        >
                            Load Template
                        </button>
                    </div>
                    <textarea
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-32"
                        value={body}
                        onChange={e => setBody(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Use <code>{`{{firstName}}`}</code> for variables.</p>
                </div>
            </div>

            <Button onClick={handleCreate} className="w-full" disabled={loading}>
                {loading ? 'Creating...' : 'Create Draft'}
            </Button>

            <div className="text-center">
                <button onClick={onNext} className="text-sm text-gray-400 hover:text-gray-600">Skip for now</button>
            </div>
        </div>
    );
}
