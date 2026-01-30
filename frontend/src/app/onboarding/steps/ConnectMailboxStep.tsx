"use client";

import { useState } from 'react';
import { Button } from '@/components/Button';
import { api } from '@/lib/api';
import { Mail, CheckCircle } from 'lucide-react';

export default function ConnectMailboxStep({ onNext, defaultCompleted }: { onNext: () => void, defaultCompleted?: boolean }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState(''); // App Password
    const [host, setHost] = useState('smtp.gmail.com');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(defaultCompleted || false);

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

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Simplified SMTP connection for onboarding
            // In a real app, might want OAuth
            await api.post('/api/mailboxes', {
                email,
                smtpUser: email,
                smtpPass: password,
                smtpHost: host,
                smtpPort: 587,
                imapHost: host === 'smtp.gmail.com' ? 'imap.gmail.com' : 'imap.mail.com', // guess
                imapPort: 993
            });
            setSuccess(true);
        } catch {
            setError('Failed to connect. Please check credentials (use App Password for Gmail).');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <Mail className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                <h3 className="text-lg font-medium">Connect your sending email</h3>
                <p className="text-sm text-gray-500">We need an account to send emails from.</p>
            </div>

            <form onSubmit={handleConnect} className="space-y-4">
                {error && <div className="text-red-500 text-sm text-center">{error}</div>}

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
                    <label className="block text-sm font-medium text-gray-700">SMTP Host</label>
                    <select
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        value={host}
                        onChange={e => setHost(e.target.value)}
                    >
                        <option value="smtp.gmail.com">Gmail (smtp.gmail.com)</option>
                        <option value="smtp.office365.com">Outlook (smtp.office365.com)</option>
                        <option value="smtp.mail.yahoo.com">Yahoo</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">App Password / SMTP Password</label>
                    <input
                        type="password"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                    />
                    <p className="text-xs text-gray-500 mt-1">For Gmail, use an Google App Password, not your login password.</p>
                </div>

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
