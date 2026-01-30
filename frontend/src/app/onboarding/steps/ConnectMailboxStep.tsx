"use client";

import { useState } from 'react';
import { Button } from '@/components/Button';
import { api } from '@/lib/api';
import { Mail, CheckCircle, Server, Settings } from 'lucide-react';

const PRESETS: Record<string, { name: string, smtp: string, imap: string, smtpPort: number, imapPort: number }> = {
    gmail: { name: 'Gmail / Google Workspace', smtp: 'smtp.gmail.com', imap: 'imap.gmail.com', smtpPort: 587, imapPort: 993 },
    outlook: { name: 'Outlook / Office 365', smtp: 'smtp.office365.com', imap: 'outlook.office365.com', smtpPort: 587, imapPort: 993 },
    zoho: { name: 'Zoho Mail', smtp: 'smtp.zoho.com', imap: 'imap.zoho.com', smtpPort: 465, imapPort: 993 },
    yahoo: { name: 'Yahoo Mail', smtp: 'smtp.mail.yahoo.com', imap: 'imap.mail.yahoo.com', smtpPort: 465, imapPort: 993 },
    custom: { name: 'Custom SMTP/IMAP', smtp: '', imap: '', smtpPort: 587, imapPort: 993 }
};

export default function ConnectMailboxStep({ onNext, defaultCompleted }: { onNext: () => void, defaultCompleted?: boolean }) {
    const [provider, setProvider] = useState('gmail');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Dynamic settings
    const [smtpHost, setSmtpHost] = useState(PRESETS.gmail.smtp);
    const [smtpPort, setSmtpPort] = useState(PRESETS.gmail.smtpPort);
    const [imapHost, setImapHost] = useState(PRESETS.gmail.imap);
    const [imapPort, setImapPort] = useState(PRESETS.gmail.imapPort);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(defaultCompleted || false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    if (success) {
        return (
            <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-medium mb-4">Mailbox Connected!</h3>
                <p className="text-gray-500 mb-6">You are ready to send emails.</p>
                <Button onClick={onNext} className="w-full">Continue</Button>
            </div>
        );
    }

    const handleProviderChange = (key: string) => {
        setProvider(key);
        if (key !== 'custom') {
            const p = PRESETS[key];
            setSmtpHost(p.smtp);
            setSmtpPort(p.smtpPort);
            setImapHost(p.imap);
            setImapPort(p.imapPort);
            setShowAdvanced(false);
        } else {
            setShowAdvanced(true);
        }
    };

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await api.post('/api/mailboxes', {
                email,
                smtpUser: email,
                smtpPass: password,
                smtpHost,
                smtpPort,
                imapHost,
                imapPort,
                name: PRESETS[provider]?.name || 'Custom'
            });
            setSuccess(true);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to connect. Please check your credentials (use App Password).');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <Mail className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                <h3 className="text-lg font-medium">Connect your Mailbox</h3>
                <p className="text-sm text-gray-500">Select your provider to auto-fill settings.</p>
            </div>

            <form onSubmit={handleConnect} className="space-y-4">
                {error && <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{error}</div>}

                {/* Provider Selector */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Email Provider</label>
                    <select
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white"
                        value={provider}
                        onChange={e => handleProviderChange(e.target.value)}
                    >
                        {Object.entries(PRESETS).map(([key, val]) => (
                            <option key={key} value={key}>{val.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Email Address</label>
                    <input
                        type="email"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@company.com"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">App Password</label>
                    <input
                        type="password"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Use an <strong>App Password</strong> (not your login password) for Gmail/Outlook.
                    </p>
                </div>

                {/* Advanced Settings Checkbox */}
                <div className="flex items-center">
                    <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="text-sm text-gray-500 flex items-center hover:text-gray-700"
                    >
                        <Settings className="w-4 h-4 mr-1" />
                        {showAdvanced ? 'Hide Server Settings' : 'Show Server Settings (Advanced)'}
                    </button>
                </div>

                {/* Advanced Fields */}
                {showAdvanced && (
                    <div className="bg-gray-50 p-4 rounded-md space-y-3 border border-gray-200">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600">SMTP Host</label>
                                <input type="text" className="mt-1 block w-full border border-gray-300 rounded text-sm p-1" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600">Port</label>
                                <input type="number" className="mt-1 block w-full border border-gray-300 rounded text-sm p-1" value={smtpPort} onChange={e => setSmtpPort(Number(e.target.value))} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600">IMAP Host</label>
                                <input type="text" className="mt-1 block w-full border border-gray-300 rounded text-sm p-1" value={imapHost} onChange={e => setImapHost(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600">Port</label>
                                <input type="number" className="mt-1 block w-full border border-gray-300 rounded text-sm p-1" value={imapPort} onChange={e => setImapPort(Number(e.target.value))} />
                            </div>
                        </div>
                    </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Connecting...' : 'Connect Account'}
                </Button>

                <div className="text-center">
                    <button type="button" onClick={onNext} className="text-sm text-gray-400 hover:text-gray-600">Skip for now</button>
                </div>
            </form>
        </div>
    );
}
