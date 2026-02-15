"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/Button';
import { analyzeCampaign } from '@/utils/qualityAnalyzer';
import { Check, ChevronRight, ChevronLeft, Plus, Trash, Clock } from 'lucide-react';

// Types
interface Mailbox { id: string; email: string; }
interface Lead { id: string; email: string; }
interface Step {
    type: 'EMAIL' | 'DELAY';
    subject?: string;
    body?: string;
    previewText?: string;
    delayDays?: number;
    order: number;
    condition?: string;
}

export default function NewCampaignPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);

    // Data State
    const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);

    // Form State
    const [campaignName, setCampaignName] = useState('');
    const [selectedMailbox, setSelectedMailbox] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    const [sequences, setSequences] = useState<Step[]>([
        { type: 'EMAIL', subject: '', body: '', previewText: '', order: 0 },
        { type: 'EMAIL', subject: '', body: '', previewText: '', order: 2, delayDays: 7 }
    ]);

    // Quality State
    const [qualityResult, setQualityResult] = useState<any>({ score: 100, warnings: [], suggestions: [] });

    useEffect(() => {
        // Run analysis on change
        const result = analyzeCampaign(sequences);
        setQualityResult(result);
    }, [sequences]);

    // Load Data
    useEffect(() => {
        api.get('/mailboxes').then(res => setMailboxes(res.data));
        api.get('/leads?limit=1000').then(res => {
            const data = res.data;
            if (data && Array.isArray(data.data)) {
                setLeads(data.data);
            } else if (Array.isArray(data)) {
                setLeads(data);
            } else {
                setLeads([]);
            }
        });
    }, []);

    // Handlers
    const toggleLead = (id: string) => {
        if (selectedLeads.includes(id)) {
            setSelectedLeads(selectedLeads.filter(l => l !== id));
        } else {
            setSelectedLeads([...selectedLeads, id]);
        }
    };

    const addStep = () => {
        setSequences([...sequences, { type: 'EMAIL', subject: '', body: '', previewText: '', order: sequences.length }]);
    };

    const updateStep = (index: number, field: string, value: string | number) => {
        const newSeqs = [...sequences];
        // @ts-ignore
        newSeqs[index][field] = value;
        setSequences(newSeqs);
    };

    const removeStep = (index: number) => {
        setSequences(sequences.filter((_, i) => i !== index));
    };

    const handleLaunch = async () => {
        setSubmitting(true);
        try {
            // 1. Create Campaign
            const campaignRes = await api.post('/campaigns', {
                name: campaignName,
                mailboxId: selectedMailbox,
                startTime,
                endTime,
                timezone
            });
            const campaignId = campaignRes.data.id;

            // 2. Add Sequences
            for (let i = 0; i < sequences.length; i++) {
                await api.post(`/campaigns/${campaignId}/steps`, {
                    ...sequences[i],
                    order: i
                });
            }

            // 3. Add Leads
            for (const leadId of selectedLeads) {
                await api.post(`/campaigns/${campaignId}/leads`, { leadId });
            }

            // 4. Activate
            await api.patch(`/campaigns/${campaignId}/status`, { status: 'ACTIVE' });

            router.push('/campaigns');
        } catch (err) {
            alert('Failed to launch campaign: ' + String(err));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8">
            {/* Progress Bar */}
            <div className="flex justify-between items-center mb-8 px-12">
                {[1, 2, 3, 4].map((s) => (
                    <div key={s} className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                            }`}>
                            {step > s ? <Check className="w-5 h-5" /> : s}
                        </div>
                        {s < 4 && <div className={`w-16 h-1 mx-2 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />}
                    </div>
                ))}
            </div>

            <div className="bg-white shadow rounded-lg p-8 min-h-[400px]">
                {/* STEP 1: BASICS */}
                {step === 1 && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold">Campaign Basics</h2>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Campaign Name</label>
                            <input
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                value={campaignName}
                                onChange={e => setCampaignName(e.target.value)}
                                placeholder="e.g. Q1 Outreach"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Sender Mailbox</label>
                            <select
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                value={selectedMailbox}
                                onChange={e => setSelectedMailbox(e.target.value)}
                            >
                                <option value="">Select a mailbox...</option>
                                {mailboxes.map(mb => (
                                    <option key={mb.id} value={mb.id}>{mb.email}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Start Time ({timezone})</label>
                                <input className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">End Time</label>
                                <input className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Timezone</label>
                            <select className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2" value={timezone} onChange={e => setTimezone(e.target.value)}>
                                {Intl.supportedValuesOf('timeZone').map(tz => (
                                    <option key={tz} value={tz}>{tz}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* STEP 2: LEADS */}
                {step === 2 && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold">Select Leads</h2>
                            <span className="text-sm text-gray-500">{selectedLeads.length} selected</span>
                        </div>
                        <div className="border rounded-md max-h-96 overflow-y-auto">
                            <ul className="divide-y divide-gray-200">
                                {leads.map(lead => (
                                    <li key={lead.id} className="p-3 flex items-center hover:bg-gray-50 cursor-pointer" onClick={() => toggleLead(lead.id)}>
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-blue-600 rounded"
                                            checked={selectedLeads.includes(lead.id)}
                                            readOnly
                                        />
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-gray-900">{lead.email}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {/* STEP 3: SEQUENCES */}
                {step === 3 && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold">Sequence Steps</h2>
                            <div className={`text-sm font-bold ${qualityResult.score >= 80 ? 'text-green-600' : qualityResult.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                Quality Score: {qualityResult.score}/100
                            </div>
                        </div>

                        {/* Quality Feedback Inline */}
                        {qualityResult.suggestions.length > 0 && (
                            <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-2">
                                <p className="text-xs font-bold text-blue-800 mb-1">💡 Optimization Tips:</p>
                                <ul className="list-disc list-inside text-xs text-blue-700">
                                    {qualityResult.suggestions.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                </ul>
                            </div>
                        )}
                        {qualityResult.warnings.length > 0 && (
                            <div className="bg-red-50 p-3 rounded-md border border-red-100 mb-4">
                                <p className="text-xs font-bold text-red-800 mb-1">⚠️ Critical Issues:</p>
                                <ul className="list-disc list-inside text-xs text-red-700">
                                    {qualityResult.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                                </ul>
                            </div>
                        )}

                        <div className="bg-gray-100 p-2 rounded text-xs text-gray-600 mb-4 flex justify-between">
                            <span><strong>Variables:</strong> <code>{"{{firstName}}"}</code>, <code>{"{{company}}"}</code></span>
                            <span><strong>Spintax:</strong> <code>{"{{Hi|Hello}}"}</code></span>
                        </div>

                        {sequences.map((seq, idx) => (
                            <div key={idx} className="border rounded-md p-4 bg-gray-50 relative">
                                <span className="absolute top-2 right-2 text-xs font-bold text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                    {idx === 0 ? "Initial Email" : `Follow-up ${idx}`}
                                </span>

                                <div className="mb-3 mt-4">
                                    <label className="block text-xs font-uppercase text-gray-500 font-bold mb-1">Subject</label>
                                    <input
                                        className="block w-full rounded-md border-gray-300 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                        value={seq.subject}
                                        onChange={e => updateStep(idx, 'subject', e.target.value)}
                                        placeholder={idx === 0 ? "Quick question for {{firstName}}" : "Following up on my last email"}
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="block text-xs font-uppercase text-gray-500 font-bold mb-1">
                                        Preview Text <span className="text-gray-400 font-normal ml-1">(Crucial for open rates)</span>
                                    </label>
                                    <input
                                        className="block w-full rounded-md border-gray-300 px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                        value={seq.previewText || ''}
                                        onChange={e => updateStep(idx, 'previewText', e.target.value)}
                                        placeholder="e.g. Most teams miss this opportunity..."
                                    />
                                </div>

                                <div className="mb-2">
                                    <label className="block text-xs font-uppercase text-gray-500 font-bold mb-1 flex justify-between">
                                        <span>Body</span>
                                        <span className={`text-xs ${(seq.body?.split(/\s+/).length || 0) > 200 ? 'text-red-500 font-bold' : 'text-gray-400'
                                            }`}>
                                            Word Count: {seq.body?.trim() ? seq.body.trim().split(/\s+/).length : 0}
                                        </span>
                                    </label>
                                    <textarea
                                        className="block w-full rounded-md border-gray-300 px-3 py-2 text-sm h-32 font-mono text-sm focus:ring-blue-500 focus:border-blue-500"
                                        value={seq.body}
                                        onChange={e => updateStep(idx, 'body', e.target.value)}
                                        placeholder={idx === 0
                                            ? "Hi {{firstName}},\n\n[Hook: 1-2 lines]\n\n[Main Idea: Single concept]\n\n[CTA: Clear ask]\n\nP.S. [Reward Loop]"
                                            : "Hi {{firstName}},\n\nJust floating this to the top of your inbox..."}
                                    />
                                    <p className="text-xs text-gray-400 mt-1 text-right">Plain text mode enabled for better deliverability.</p>
                                </div>

                                {idx > 0 && (
                                    <div className="flex flex-wrap items-center gap-4 mt-2 bg-white p-2 rounded border">
                                        <div className="flex items-center gap-2 border-r pr-4">
                                            <Clock className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm text-gray-600">Wait</span>
                                            <input
                                                type="number"
                                                className="w-16 rounded-md border-gray-300 py-1 px-2 text-sm"
                                                value={seq.delayDays || 0}
                                                onChange={e => updateStep(idx, 'delayDays', Number(e.target.value))}
                                            />
                                            <span className="text-sm text-gray-600">days</span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-gray-700">Condition:</span>
                                            <select
                                                className="text-sm border-gray-300 rounded-md py-1 px-2"
                                                value={seq.condition || 'IF_NO_REPLY'}
                                                onChange={e => updateStep(idx, 'condition', e.target.value)}
                                            >
                                                <option value="ALWAYS">Always Send</option>
                                                <option value="IF_NO_REPLY">If No Reply (Recommended)</option>
                                                <option value="IF_NO_OPEN">If Not Opened</option>
                                                <option value="IF_CLICKED">If Clicked Link</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                                <div className="mt-2 text-right">
                                    <Button variant="secondary" onClick={() => removeStep(idx)} className="text-red-600 hover:text-red-700 text-xs">
                                        <Trash className="w-3 h-3 mr-1" /> Remove Step
                                    </Button>
                                </div>
                            </div>
                        ))}
                        <Button variant="secondary" onClick={addStep} className="w-full border-dashed">
                            <Plus className="w-4 h-4 mr-2" /> Add Next Step
                        </Button>
                    </div>
                )}

                {/* STEP 4: REVIEW */}
                {step === 4 && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold">Review & Launch</h2>
                        <div className="bg-gray-50 p-4 rounded-md space-y-2">
                            <p><strong>Name:</strong> {campaignName}</p>
                            <p><strong>Mailbox:</strong> {mailboxes.find(m => m.id === selectedMailbox)?.email || 'None'}</p>
                            <p><strong>Leads:</strong> {selectedLeads.length} leads selected</p>
                            <p><strong>Sequence:</strong> {sequences.length} steps</p>
                        </div>

                        {/* Quality Score Final Review */}
                        <div className="border rounded-md p-4 bg-white shadow-sm mt-4">
                            <h3 className="text-lg font-bold mb-2">Campaign Quality Score</h3>
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`text-3xl font-bold ${qualityResult.score >= 80 ? 'text-green-600' :
                                    qualityResult.score >= 50 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>
                                    {qualityResult.score}/100
                                </div>
                                <div className="text-sm text-gray-500">
                                    {qualityResult.score >= 80 ? 'Excellent! Ready to launch.' :
                                        qualityResult.score >= 50 ? 'Good, but could be better.' : 'Needs improvement before launching.'}
                                </div>
                            </div>

                            {qualityResult.warnings.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="text-sm font-bold text-red-600 mb-1">Warnings:</h4>
                                    <ul className="list-disc list-inside text-sm text-red-700">
                                        {qualityResult.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                                    </ul>
                                </div>
                            )}

                            {qualityResult.suggestions.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-bold text-blue-600 mb-1">Suggestions:</h4>
                                    <ul className="list-disc list-inside text-sm text-blue-700">
                                        {qualityResult.suggestions.map((s: string, i: number) => <li key={i}>{s}</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>


            {/* Navigation */}
            <div className="flex justify-between mt-8">
                <Button
                    variant="secondary"
                    onClick={() => setStep(step - 1)}
                    disabled={step === 1}
                >
                    <ChevronLeft className="w-4 h-4 mr-2" /> Back
                </Button>

                {step < 4 ? (
                    <Button
                        onClick={() => setStep(step + 1)}
                        disabled={
                            (step === 1 && (!campaignName || !selectedMailbox)) ||
                            (step === 2 && selectedLeads.length === 0)
                        }
                    >
                        Next <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                ) : (
                    <Button onClick={handleLaunch} disabled={submitting} className="bg-green-600 hover:bg-green-700">
                        {submitting ? 'Launching...' : 'Launch Campaign'}
                    </Button>
                )}
            </div>
        </div>
    );
}
