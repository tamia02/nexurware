"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/Button';
import { ArrowLeft, Upload } from 'lucide-react';
import Link from 'next/link';

export default function NewLeadPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Single Form State
    const [formData, setFormData] = useState({
        email: '',
        firstName: '',
        lastName: '',
        company: ''
    });

    // Bulk Form State
    const [bulkJson, setBulkJson] = useState('');

    const handleSingleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            console.log('Submitting lead to:', api.defaults.baseURL + '/leads');
            await api.post('/leads', formData);
            router.push('/leads');
        } catch (err) {
            console.error(err);
            alert('Failed to create lead');
            setIsSubmitting(false);
        }
    };

    const handleBulkSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            let leads;
            try {
                leads = JSON.parse(bulkJson);
                if (!Array.isArray(leads)) throw new Error('Not an array');
            } catch {
                alert("Invalid JSON. Must be an array of objects.");
                setIsSubmitting(false);
                return;
            }

            const res = await api.post('/leads/bulk', { leads });
            const { created, updated, errors } = res.data;
            let message = `Imported ${created} new leads, updated ${updated} existing.`;

            if (errors && errors.length > 0) {
                message += `\n${errors.length} Failed. Check console for details.`;
                console.warn("Import errors:", errors);
            }
            alert(message);
            router.push('/leads');
        } catch (err) {
            console.error(err);
            alert('Failed to import leads');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <Link href="/leads" className="text-gray-500 hover:text-gray-700 flex items-center gap-2 mb-6">
                <ArrowLeft className="w-4 h-4" /> Back to Leads
            </Link>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="border-b border-gray-200 flex">
                    <button
                        className={`flex-1 py-4 text-sm font-medium text-center ${activeTab === 'single' ? 'bg-gray-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('single')}
                    >
                        Single Entry
                    </button>
                    <button
                        className={`flex-1 py-4 text-sm font-medium text-center ${activeTab === 'bulk' ? 'bg-gray-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('bulk')}
                    >
                        Bulk Import (JSON)
                    </button>
                </div>

                <div className="p-6">
                    {activeTab === 'single' ? (
                        <form onSubmit={handleSingleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.firstName}
                                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.lastName}
                                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                                <input
                                    type="email"
                                    required
                                    className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                                <input
                                    type="text"
                                    className="w-full rounded-md border border-gray-300 p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.company}
                                    onChange={e => setFormData({ ...formData, company: e.target.value })}
                                />
                            </div>
                            <div className="pt-2">
                                <Button type="submit" disabled={isSubmitting} className="w-full">
                                    Save Lead
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleBulkSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Paste JSON Array</label>
                                <p className="text-xs text-gray-500 mb-2">Example: <code>[{`{"email": "...", "firstName": "..."}`}]</code></p>
                                <textarea
                                    required
                                    rows={10}
                                    className="w-full rounded-md border border-gray-300 p-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder='[{"email": "jane@example.com", "firstName": "Jane"}, ...]'
                                    value={bulkJson}
                                    onChange={e => setBulkJson(e.target.value)}
                                />
                            </div>

                            {/* Analysis Section */}
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={async () => {
                                        try {
                                            const leads = JSON.parse(bulkJson);
                                            if (!Array.isArray(leads)) throw new Error("Not an array");
                                            const emails = leads.map(l => l.email).filter(Boolean);
                                            if (emails.length === 0) {
                                                alert("No emails found in JSON");
                                                return;
                                            }

                                            // Call Analysis API
                                            const res = await api.post('/leads/analyze', { emails });
                                            const results = res.data.results;

                                            // Summarize
                                            const risky = results.filter((r: any) => r.risk === 'HIGH').length;
                                            const disposable = results.filter((r: any) => r.isDisposable).length;

                                            alert(`Analysis Complete:\nTotal: ${results.length}\nRisky: ${risky}\nDisposable: ${disposable}\n\nCheck console for details.`);
                                            console.table(results);
                                        } catch (e) {
                                            alert("Invalid JSON or Error: " + e);
                                        }
                                    }}
                                >
                                    Analyze Risks
                                </Button>
                                <Button type="submit" disabled={isSubmitting} className="flex-1">
                                    <Upload className="w-4 h-4 mr-2" />
                                    Import Leads
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
