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
                    <h3 className="text-lg font-medium mb-4">SMTP / IMAP Configuration</h3>
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
                            <label className="block text-sm font-medium text-gray-700">From Name</label>
                            <input
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                placeholder="e.g. John Doe"
                                value={formData.fromName}
                                onChange={e => setFormData({ ...formData, fromName: e.target.value })}
                            />
                        </div>

                        {/* SMTP */}
                        <div className="col-span-2 mt-2">
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
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Username</label>
                            <input
                                required
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                value={formData.smtpUser}
                                onChange={e => setFormData({ ...formData, smtpUser: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Password</label>
                            <input
                                required
                                type="password"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                value={formData.smtpPass}
                                onChange={e => setFormData({ ...formData, smtpPass: e.target.value })}
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
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Username</label>
                            <input
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                value={formData.imapUser}
                                onChange={e => setFormData({ ...formData, imapUser: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Password</label>
                            <input
                                type="password"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                                value={formData.imapPass}
                                onChange={e => setFormData({ ...formData, imapPass: e.target.value })}
                            />
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
                            <Button type="submit" disabled={testing}>Save Configuration</Button>
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
