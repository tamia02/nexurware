"use client";

import { useState } from 'react';
import { Button } from '@/components/Button';
import { api } from '@/lib/api';
import { Users, CheckCircle } from 'lucide-react';

export default function ImportLeadsStep({ onNext, defaultCompleted }: { onNext: () => void, defaultCompleted?: boolean }) {
    const [leadText, setLeadText] = useState('john@example.com, John Doe\njane@company.com, Jane Smith');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(defaultCompleted || false);

    if (success) {
        return (
            <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-medium mb-4">Leads Added!</h3>
                <Button onClick={onNext} className="w-full">Continue</Button>
            </div>
        );
    }

    const handleImport = async () => {
        setLoading(true);
        try {
            // Parse simplistic CSV (Email, Name)
            const lines = leadText.split('\n');
            const leads = lines.map(line => {
                const [email, name] = line.split(',');
                if (!email) return null;
                return {
                    email: email.trim(),
                    firstName: name ? name.trim() : undefined
                };
            }).filter(Boolean);

            if (leads.length > 0) {
                await api.post('/api/leads/bulk', { leads });
                setSuccess(true);
            }
        } catch (err) {
            console.error('Import failed', err);
            // alert('Failed to import');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <Users className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                <h3 className="text-lg font-medium">Add your first leads</h3>
                <p className="text-sm text-gray-500">Paste your leads below (Email, Name)</p>
            </div>

            <div>
                <textarea
                    className="w-full h-32 border border-gray-300 rounded-md p-2 font-mono text-sm"
                    value={leadText}
                    onChange={e => setLeadText(e.target.value)}
                    placeholder="email@example.com, Name"
                />
            </div>

            <Button onClick={handleImport} className="w-full" disabled={loading}>
                {loading ? 'Importing...' : 'Import Leads'}
            </Button>

            <div className="text-center">
                <button onClick={onNext} className="text-sm text-gray-400 hover:text-gray-600">Skip for now</button>
            </div>
        </div>
    );
}
