"use client";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/Button';
import { Trash, Server, CheckCircle, XCircle } from 'lucide-react';

interface Mailbox {
    id: string;
    email: string;
    fromName?: string;
    status: string;
    smtpHost: string;
    smtpPort: number;
    imapHost?: string;
}

export default function SettingsPage() {
    const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
    // const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [testing, setTesting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        email: '',
        fromName: '',
        name: '',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUser: '',
        smtpPass: '',
        imapHost: 'imap.gmail.com',
        imapPort: 993,
        imapUser: '',
        imapPass: '',
        dailyLimit: 50
    });

    const loadMailboxes = () => {
        // setLoading(true); // removed unused state usage
        api.get('/mailboxes')
            .then(res => setMailboxes(res.data))
            .catch(console.error);
        // .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadMailboxes();
    }, []);

    const handleTest = async () => {
        setTesting(true);
        try {
            await api.post('/mailboxes/test-connection', formData);
            alert('Connection Successful!');
        } catch (err: any) {
            alert('Connection Failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setTesting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/mailboxes', formData);
            setShowForm(false);
            loadMailboxes();
            // Reset crucial fields
            setFormData({ ...formData, email: '', smtpUser: '', smtpPass: '', imapUser: '', imapPass: '' });
        } catch (err) {
            alert('Failed to save mailbox: ' + String(err));
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        try {
            await api.delete(`/mailboxes/${id}`);
            loadMailboxes();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Settings</h2>
                <Button onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancel' : 'Connect New Mailbox'}
                </Button>
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-white p-6 rounded-lg shadow mb-8 border border-blue-100">
                    <h3 className="text-lg font-medium mb-4">Connect New Mailbox</h3>

                    {/* Provider Selection */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">Email Provider</label>
                        <select
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-white"
                            onChange={e => {
                                const key = e.target.value;
                                if (key === 'gmail') {
                                    setFormData(prev => ({ ...prev, smtpHost: 'smtp.gmail.com', smtpPort: 587, imapHost: 'imap.gmail.com', imapPort: 993 }));
                                } else if (key === 'outlook') {
                                    setFormData(prev => ({ ...prev, smtpHost: 'smtp.office365.com', smtpPort: 587, imapHost: 'outlook.office365.com', imapPort: 993 }));
                                } else if (key === 'zoho') {
                                    setFormData(prev => ({ ...prev, smtpHost: 'smtp.zoho.com', smtpPort: 465, imapHost: 'imap.zoho.com', imapPort: 993 }));
                                } else if (key === 'yahoo') {
                                    setFormData(prev => ({ ...prev, smtpHost: 'smtp.mail.yahoo.com', smtpPort: 465, imapHost: 'imap.mail.yahoo.com', imapPort: 993 }));
                                }
                                // 'custom' does nothing, leaves existing values
                            }}
                        >
                            <option value="gmail">Gmail / Google Workspace</option>
                            <option value="outlook">Outlook / Office 365</option>
                            <option value="zoho">Zoho Mail</option>
                            <option value="yahoo">Yahoo Mail</option>
                            <option value="custom">Custom SMTP/IMAP</option>
                        </select>
                    </div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Email Address</label>
                            <input
                                required
                                type="email"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700">App Password</label>
                            <input
                                required
                                type="password"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                value={formData.smtpPass}
                                onChange={e => setFormData({ ...formData, smtpPass: e.target.value, smtpUser: formData.email, imapPass: e.target.value, imapUser: formData.email })}
                                placeholder="••••••••••••"
                            />
                            <p className="text-xs text-gray-500 mt-1">Use an <strong>App Password</strong> for Gmail/Outlook.</p>
                        </div>
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Sender Name (Optional)</label>
                            <input
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                placeholder="e.g. John Doe"
                                value={formData.fromName}
                                onChange={e => setFormData({ ...formData, fromName: e.target.value })}
                            />
                        </div>


                        {/* Advanced Settings Toggle - Simplified for now, just always show but grouped visually different or keep basic fields hidden? 
                            Let's keep them visible but implicitly filled, or maybe put them in a <details> block? 
                            Let's use a details block for "Server Settings (Advanced)" 
                        */}
                        <div className="col-span-2">
                            <details className="text-sm">
                                <summary className="cursor-pointer text-gray-600 font-medium">Advanced Server Settings</summary>
                                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 border-t pt-4">
                                    {/* SMTP */}
                                    <div className="col-span-2">
                                        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                            <Server className="w-4 h-4" /> SMTP Settings (Sending)
                                        </h4>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Host</label>
                                        <input
                                            required
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                            value={formData.smtpHost}
                                            onChange={e => setFormData({ ...formData, smtpHost: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Port</label>
                                        <input
                                            required
                                            type="number"
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                            value={formData.smtpPort}
                                            onChange={e => setFormData({ ...formData, smtpPort: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700">SMTP Username</label>
                                        <input
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                            value={formData.smtpUser || formData.email}
                                            onChange={e => setFormData({ ...formData, smtpUser: e.target.value })}
                                            placeholder="Usually same as email"
                                        />
                                    </div>

                                    {/* IMAP */}
                                    <div className="col-span-2 mt-4">
                                        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                            <Server className="w-4 h-4" /> IMAP Settings (Receiving)
                                        </h4>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Host</label>
                                        <input
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                            value={formData.imapHost}
                                            onChange={e => setFormData({ ...formData, imapHost: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Port</label>
                                        <input
                                            type="number"
                                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                            value={formData.imapPort}
                                            onChange={e => setFormData({ ...formData, imapPort: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </details>
                        </div>

                        <div className="col-span-2 mt-4 flex gap-2">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleTest}
                                disabled={testing}
                            >
                                {testing ? 'Testing...' : 'Test Connection'}
                            </Button>
                            <Button type="submit" disabled={testing}>Save Mailbox</Button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="bg-white shadow rounded-md overflow-hidden">
                <ul role="list" className="divide-y divide-gray-200">
                    {mailboxes.length === 0 ? (
                        <li className="p-10 text-center text-gray-500">
                            No mailboxes connected. Click &quot;Connect New Mailbox&quot; to start.
                        </li>
                    ) : mailboxes.map((mb) => (
                        <li key={mb.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-gray-900">{mb.email}</p>
                                    {mb.status === 'CONNECTED' ? (
                                        <div className="flex items-center text-green-600 text-xs bg-green-50 px-2 py-0.5 rounded-full">
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            Active
                                        </div>
                                    ) : (
                                        <div className="flex items-center text-gray-500 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                                            <XCircle className="w-3 h-3 mr-1" />
                                            {mb.status}
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {mb.fromName || 'No Name'} • SMTP: {mb.smtpHost}:{mb.smtpPort}
                                </p>
                            </div>
                            <button
                                onClick={() => handleDelete(mb.id)}
                                className="text-red-600 hover:text-red-900 p-2"
                            >
                                <Trash className="w-4 h-4" />
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
