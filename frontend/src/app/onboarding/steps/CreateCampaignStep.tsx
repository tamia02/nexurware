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

    // Autocomplete State
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestionQuery, setSuggestionQuery] = useState('');

    const availableTags = [
        { tag: '{{firstName}}', desc: 'First Name' },
        { tag: '{{lastName}}', desc: 'Last Name' },
        { tag: '{{company}}', desc: 'Company Name' },
        { tag: '{{email}}', desc: 'Email' }
    ];

    const handleFieldChange = (field: 'subject' | 'body', value: string) => {
        if (field === 'subject') setSubject(value);
        else setBody(value);

        // Check for {{ trigger
        if (value.includes('{{')) {
            const lastDoubleBrace = value.lastIndexOf('{{');
            const afterBrace = value.substring(lastDoubleBrace + 2);
            if (!afterBrace.includes('}}')) {
                setFocusedField(field);
                setSuggestionQuery(afterBrace);
                setShowSuggestions(true);
            } else {
                setShowSuggestions(false);
            }
        } else {
            setShowSuggestions(false);
        }
    };

    const insertTag = (tag: string) => {
        if (!focusedField) return;
        const currentContent = focusedField === 'subject' ? subject : body;

        let newContent = '';
        if (showSuggestions) {
            const lastDoubleBrace = currentContent.lastIndexOf('{{');
            newContent = currentContent.substring(0, lastDoubleBrace) + tag;
        } else {
            newContent = currentContent + tag;
        }

        if (focusedField === 'subject') setSubject(newContent);
        else setBody(newContent);

        setShowSuggestions(false);
    };

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
            const res = await api.post('/campaigns', { name });
            const campaignId = res.data.id;

            // Add Step 1 (Email)
            await api.post(`/campaigns/${campaignId}/sequences`, {
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

                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700">Subject Line</label>
                    <input
                        type="text"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        value={subject}
                        onFocus={() => setFocusedField('subject')}
                        onChange={e => handleFieldChange('subject', e.target.value)}
                    />
                    {showSuggestions && focusedField === 'subject' && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {availableTags
                                .filter(t => t.tag.toLowerCase().includes(suggestionQuery.toLowerCase()))
                                .map(item => (
                                    <button
                                        key={item.tag}
                                        onClick={() => insertTag(item.tag)}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 flex justify-between items-center"
                                    >
                                        <span className="font-mono text-blue-600">{item.tag}</span>
                                        <span className="text-xs text-gray-400">{item.desc}</span>
                                    </button>
                                ))}
                        </div>
                    )}
                </div>

                <div className="relative">
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
                        onFocus={() => setFocusedField('body')}
                        onChange={e => handleFieldChange('body', e.target.value)}
                    />
                    {showSuggestions && focusedField === 'body' && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto bottom-full mb-1">
                            {availableTags
                                .filter(t => t.tag.toLowerCase().includes(suggestionQuery.toLowerCase()))
                                .map(item => (
                                    <button
                                        key={item.tag}
                                        onClick={() => insertTag(item.tag)}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 flex justify-between items-center"
                                    >
                                        <span className="font-mono text-blue-600">{item.tag}</span>
                                        <span className="text-xs text-gray-400">{item.desc}</span>
                                    </button>
                                ))}
                        </div>
                    )}
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
