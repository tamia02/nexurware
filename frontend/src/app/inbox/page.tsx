'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
// import { useAuth } from '@/context/AuthContext'; // Unused
import { RefreshCw, Mail, User } from 'lucide-react';

export default function InboxPage() {
    // const { token } = useAuth(); // Unused
    const [mailboxes, setMailboxes] = useState<any[]>([]);
    const [selectedMailbox, setSelectedMailbox] = useState<string>('');
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Fetch mailboxes
        api.get('/mailboxes').then(res => {
            setMailboxes(res.data);
            if (res.data.length > 0) setSelectedMailbox(res.data[0].id);
        });
    }, []);

    useEffect(() => {
        if (selectedMailbox) {
            fetchMessages();
        }
    }, [selectedMailbox]);

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/inbox/${selectedMailbox}/messages`);
            setMessages(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        if (!selectedMailbox) return;
        setLoading(true);
        try {
            await api.post(`/inbox/${selectedMailbox}/sync`);
            await fetchMessages();
        } catch (err) {
            alert('Failed to sync');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Unified Inbox</h1>
                <div className="flex gap-4">
                    <select
                        className="border p-2 rounded"
                        value={selectedMailbox}
                        onChange={e => setSelectedMailbox(e.target.value)}
                    >
                        {mailboxes.map(mb => (
                            <option key={mb.id} value={mb.id}>{mb.email}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleSync}
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2"
                    >
                        <RefreshCw className={loading ? 'animate-spin' : ''} /> Sync
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow">
                {messages.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No messages found. Try syncing.
                    </div>
                ) : (
                    <div className="divide-y">
                        {messages.map(msg => (
                            <div key={msg.id} className="p-4 hover:bg-gray-50 cursor-pointer">
                                <div className="flex justify-between mb-1">
                                    <span className="font-bold flex items-center gap-2">
                                        {msg.lead ? <User className="text-blue-500" /> : <Mail />}
                                        {msg.fromEmail}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-400">
                                            {new Date(msg.receivedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center mb-1">
                                    <h3 className="font-medium text-gray-900">{msg.subject}</h3>
                                    {msg.lead?.classification && (
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${msg.lead.classification === 'POSITIVE' ? 'bg-green-100 text-green-800' :
                                                msg.lead.classification === 'NEGATIVE' ? 'bg-red-100 text-red-800' :
                                                    msg.lead.classification === 'OOO' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-gray-100 text-gray-600'
                                            }`}>
                                            {msg.lead.classification}
                                        </span>
                                    )}
                                </div>
                                <p className="text-gray-600 truncate text-sm">{msg.snippet || msg.body?.substring(0, 100)}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
