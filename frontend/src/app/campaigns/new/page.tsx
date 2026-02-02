"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/Button';
import { Check, ChevronRight, ChevronLeft, Plus, Trash, Clock } from 'lucide-react';

// Types
interface Mailbox { id: string; email: string; }
interface Lead { id: string; email: string; }
interface Step {
    type: 'EMAIL' | 'DELAY';
    subject?: string;
    body?: string;
    delayDays?: number;
    order: number;
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
        { type: 'EMAIL', subject: '', body: '', order: 0 },
        { type: 'EMAIL', subject: '', body: '', order: 1, delayDays: 3 },
        { type: 'EMAIL', subject: '', body: '', order: 2, delayDays: 7 }
    ]);

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
        setSequences([...sequences, { type: 'EMAIL', subject: '', body: '', order: sequences.length }]);
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
            // Note: Ideally this should be a bulk endpoint. For MVP we loop or use bulk if available.
            // Let's loop for safety as bulk endpoint might not be perfectly tested for campaign join.
            // Actually, we can use the loop in backend logic controller if we pass array, but let's do this:
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
                        <h2 className="text-xl font-bold">Sequence Steps</h2>
                        <div className="bg-blue-50 p-4 rounded text-sm text-blue-800 mb-4">
                            <strong>Tip:</strong> Use <code>{"{{firstName}}"}</code> for variables and <code>{"{{Hi|Hello}}"}</code> for variations.
                        </div>
                        {sequences.map((seq, idx) => (
                            <div key={idx} className="border rounded-md p-4 bg-gray-50 relative">
                                <span className="absolute top-2 right-2 text-xs font-bold text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                    {idx === 0 ? "Initial Email" : `Follow-up ${idx}`}
                                </span>
                                <div className="mb-2 mt-4">
                                    <label className="block text-xs font-uppercase text-gray-500 font-bold mb-1">Subject</label>
                                    <input
                                        className="block w-full rounded-md border-gray-300 px-3 py-2 text-sm"
                                        value={seq.subject}
                                        onChange={e => updateStep(idx, 'subject', e.target.value)}
                                        placeholder={idx === 0 ? "Quick question for {{firstName}}" : "Following up on my last email"}
                                    />
                                </div>
                                <div className="mb-2">
                                    <label className="block text-xs font-uppercase text-gray-500 font-bold mb-1">Body</label>
                                    <textarea
                                        className="block w-full rounded-md border-gray-300 px-3 py-2 text-sm h-32"
                                        value={seq.body}
                                        onChange={e => updateStep(idx, 'body', e.target.value)}
                                        placeholder={idx === 0
                                            ? "Hi {{firstName}},\n\nI was browsing {{company}} and noticed..."
                                            : "Hi {{firstName}},\n\nJust floating this to the top of your inbox..."}
                                    />
                                </div>
                                {idx > 0 && (
                                    <div className="flex items-center gap-4 mt-2 bg-white p-2 rounded border">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm text-gray-600">Wait</span>
                                            <input
                                                type="number"
                                                className="w-16 rounded-md border-gray-300 py-1 px-2 text-sm"
                                                value={seq.delayDays || 0}
                                                onChange={e => updateStep(idx, 'delayDays', Number(e.target.value))}
                                            />
                                            <span className="text-sm text-gray-600">days after previous email</span>
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
