"use client";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/Button';
import { Plus, Upload, Trash2, Search, X } from 'lucide-react';
import Papa from 'papaparse';
import Link from 'next/link';

interface Lead {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    company?: string;
    status: string;
}

export default function LeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Import Modal State
    const [showImport, setShowImport] = useState(false);
    const [importText, setImportText] = useState('');
    const [importing, setImporting] = useState(false);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLeads(1); // Reset to page 1 on search change
        }, 500);
        return () => clearTimeout(timer);
    }, [search, statusFilter]);

    // Handle pagination
    useEffect(() => {
        if (search === '' && statusFilter === '') { // Avoid double fetch on init if search logic handles it
            fetchLeads(page);
        } else if (page > 1) { // Only fetch if page changes and not triggered by search reset
            fetchLeads(page);
        }
    }, [page]);

    const fetchLeads = async (p = page) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', p.toString());
            params.append('limit', '50');
            if (search) params.append('search', search);
            if (statusFilter) params.append('status', statusFilter);

            const res = await api.get(`/api/leads?${params.toString()}`);
            setLeads(res.data.data);
            setTotalPages(res.data.totalPages);
            setPage(res.data.page);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(leads.map(l => l.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedIds.length} leads?`)) return;
        try {
            await api.post('/api/leads/bulk-delete', { ids: selectedIds });
            fetchLeads(page);
            setSelectedIds([]);
        } catch (err) {
            console.error(err);
            alert('Failed to delete leads');
        }
    };

    const handleImport = async () => {
        if (!importText.trim()) return;
        setImporting(true);

        Papa.parse(importText, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const parsedLeads = results.data;
                if (parsedLeads.length === 0) {
                    alert("No valid rows found in CSV.");
                    setImporting(false);
                    return;
                }

                try {
                    await api.post('/api/leads/bulk', { leads: parsedLeads });
                    alert(`Successfully imported ${parsedLeads.length} leads!`);
                    setShowImport(false);
                    setImportText('');
                    fetchLeads(1);
                } catch (err: any) {
                    alert('Import failed: ' + (err.response?.data?.error || String(err)));
                } finally {
                    setImporting(false);
                }
            },
            error: (err: any) => {
                alert('CSV Parsing Error: ' + err.message);
                setImporting(false);
            }
        });
    };

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowImport(true)}>
                        <Upload className="w-4 h-4 mr-2" />
                        Import CSV
                    </Button>
                    <Link href="/leads/new">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Lead
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex gap-4 w-full max-w-2xl">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search leads..."
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="w-48">
                        <select
                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">All Statuses</option>
                            <option value="NEW">New</option>
                            <option value="CONTACTED">Contacted</option>
                            <option value="REPLIED">Replied</option>
                            <option value="BOUNCED">Bounced</option>
                        </select>
                    </div>
                </div>

                {selectedIds.length > 0 && (
                    <Button variant="danger" onClick={handleBulkDelete}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete ({selectedIds.length})
                    </Button>
                )}
            </div>

            {/* Import Modal */}
            {showImport && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Import Leads via CSV</h3>
                            <button onClick={() => setShowImport(false)} className="text-gray-500 hover:text-gray-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">
                            Paste your CSV data below. Headers must be: <code>email, firstName, lastName, company</code>
                        </p>
                        <textarea
                            className="w-full h-48 border rounded-md p-2 font-mono text-sm"
                            placeholder={"email,firstName,lastName,company\njohn@example.com,John,Doe,Acme Inc"}
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                        />
                        <div className="mt-4 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowImport(false)}>Cancel</Button>
                            <Button onClick={handleImport} disabled={importing}>
                                {importing ? 'Importing...' : 'Import Leads'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white shadow overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                                <input
                                    type="checkbox"
                                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                                    checked={leads.length > 0 && selectedIds.length === leads.length}
                                    onChange={handleSelectAll}
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">Loading leads...</td></tr>
                        ) : leads.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">No leads found.</td></tr>
                        ) : (
                            leads.map((lead) => (
                                <tr key={lead.id} className={selectedIds.includes(lead.id) ? 'bg-blue-50' : ''}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                                            checked={selectedIds.includes(lead.id)}
                                            onChange={() => handleSelectOne(lead.id)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{lead.firstName} {lead.lastName}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">{lead.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">{lead.company || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${lead.status === 'NEW' ? 'bg-green-100 text-green-800' :
                                                lead.status === 'REPLIED' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100 text-gray-800'}`}>
                                            {lead.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                    <div className="flex flex-1 justify-between sm:justify-end gap-2">
                        <Button
                            variant="secondary"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            Previous
                        </Button>
                        <span className="self-center text-sm text-gray-700">Page {page} of {totalPages}</span>
                        <Button
                            variant="secondary"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
