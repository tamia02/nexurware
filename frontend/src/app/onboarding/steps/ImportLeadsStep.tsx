"use client";

import { useState } from 'react';
import { Button } from '@/components/Button';
import { api } from '@/lib/api';
import { Users, CheckCircle } from 'lucide-react';

export default function ImportLeadsStep({ onNext, defaultCompleted }: { onNext: () => void, defaultCompleted?: boolean }) {
    const [leadText, setLeadText] = useState('john@example.com, John Doe\njane@company.com, Jane Smith');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(defaultCompleted || false);
    const [isPersonalized, setIsPersonalized] = useState(false);

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
                // If personalized: email, name, subject, message
                const parts = line.split(',');
                const email = parts[0]?.trim();
                const name = parts[1]?.trim();
                const subject = isPersonalized ? parts[2]?.trim() : undefined;
                const message = isPersonalized ? parts.slice(3).join(',').trim() : undefined;

                if (!email || !email.includes('@')) return null;

                return {
                    email,
                    firstName: name,
                    metadata: {
                        customSubject: subject,
                        customMessage: message
                    }
                };
            }).filter(Boolean);

            if (leads.length > 0) {
                await api.post('/leads/bulk', { leads });
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
            <div className="flex justify-center mb-4">
                <div className="bg-gray-100 p-1 rounded-lg inline-flex">
                    <button
                        className={`px-4 py-2 rounded-md text-sm font-medium transition ${!isPersonalized ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
                        onClick={() => setIsPersonalized(false)}
                    >
                        Standard
                    </button>
                    <button
                        className={`px-4 py-2 rounded-md text-sm font-medium transition ${isPersonalized ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
                        onClick={() => setIsPersonalized(true)}
                    >
                        Personalized
                    </button>
                </div>
            </div>

            <div className="text-center">
                <Users className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                <h3 className="text-lg font-medium">Add your first leads</h3>
                <p className="text-sm text-gray-500 mb-2">
                    {isPersonalized
                        ? "Paste your leads below (Email, Name, Subject, Message)"
                        : "Paste your leads below (Email, Name)"
                    }
                </p>
                <button
                    onClick={() => {
                        const csvContent = isPersonalized
                            ? "email,firstName,customSubject,customMessage\njohn@example.com,John,Quick question,Hello John I noticed...\njane@test.com,Jane,Checking in,Hi Jane saw your profile..."
                            : "email,firstName\njohn@example.com,John Doe\njane@test.com,Jane";

                        const blob = new Blob([csvContent], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = isPersonalized ? 'leads_personalized_sample.csv' : 'leads_sample.csv';
                        a.click();
                    }}
                    className="text-xs text-blue-600 hover:underline"
                >
                    Download Sample CSV
                </button>
            </div>

            <div>
                <textarea
                    className="w-full h-32 border border-gray-300 rounded-md p-2 font-mono text-sm"
                    value={leadText}
                    onChange={e => setLeadText(e.target.value)}
                    placeholder={isPersonalized ? "email@example.com, Name, Subject, Message" : "email@example.com, Name"}
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
