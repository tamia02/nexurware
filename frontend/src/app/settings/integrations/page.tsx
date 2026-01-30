"use client";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/Button';
import { Copy, Check } from 'lucide-react';

interface Campaign {
    id: string;
    name: string;
}

interface Workspace {
    id: string;
}

export default function IntegrationsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [selectedCampaign, setSelectedCampaign] = useState<string>('');
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [campRes, workRes] = await Promise.all([
                    api.get('/api/campaigns'),
                    api.get('/api/workspace')
                ]);
                // API structure check: campaign list is array?
                setCampaigns(campRes.data.campaigns || campRes.data);
                setWorkspace(workRes.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const generateCode = () => {
        if (!workspace) return '';

        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        // Ensure strictly correct URL
        const endpoint = `${baseUrl}/widget/leads`;

        const hiddenInputs = [
            `<input type="hidden" name="workspaceId" value="${workspace.id}">`
        ];

        if (selectedCampaign) {
            hiddenInputs.push(`<input type="hidden" name="campaignId" value="${selectedCampaign}">`);
        }

        return `<!-- Cold Email CRM Lead Capture -->
<form action="${endpoint}" method="POST" style="font-family: sans-serif; max-width: 400px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
    <h3 style="margin-top: 0;">Subscribe</h3>
    ${hiddenInputs.join('\n    ')}
    <input type="hidden" name="redirectUrl" value="http://yoursite.com/thank-you">
    
    <div style="margin-bottom: 10px;">
        <label style="display: block; margin-bottom: 5px;">Name</label>
        <input type="text" name="name" placeholder="John Doe" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
    </div>

    <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px;">Email *</label>
        <input type="email" name="email" required placeholder="john@example.com" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
    </div>

    <button type="submit" style="background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; width: 100%;">
        Submit
    </button>
</form>`;
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generateCode());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Integrations & Widgets</h1>

            <div className="bg-white shadow sm:rounded-lg mb-8">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Lead Capture Form</h3>
                    <div className="mt-2 text-sm text-gray-500">
                        <p>Embed this form on your Wix, Wordpress, or custom website to automatically capture leads.</p>
                    </div>

                    <div className="mt-5">
                        <label className="block text-sm font-medium text-gray-700">target Campaign (Optional)</label>
                        <select
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                            value={selectedCampaign}
                            onChange={(e) => setSelectedCampaign(e.target.value)}
                        >
                            <option value="">-- Add to Leads only (No Campaign) --</option>
                            {campaigns.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-500">If selected, new leads will be automatically added to this campaign sequence.</p>
                    </div>

                    <div className="mt-5 relative">
                        <div className="absolute top-2 right-2">
                            <Button onClick={handleCopy} variant="outline" size="sm">
                                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                <span className="ml-2">{copied ? 'Copied' : 'Copy Code'}</span>
                            </Button>
                        </div>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto text-sm border border-gray-700">
                            <code>{generateCode()}</code>
                        </pre>
                    </div>

                    <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
                        <div className="flex">
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700">
                                    <strong>Tip:</strong> Change the <code>redirectUrl</code> value in the code to point to your own &quot;Thank You&quot; page.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
