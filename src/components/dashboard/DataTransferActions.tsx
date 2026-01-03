'use client';

import { useState } from 'react';
import { parseCSV } from '@/lib/csv-utils';

interface DataTransferActionsProps {
    type: 'journals' | 'users' | 'companies' | 'customers' | 'subscriptions' | 'invoices';
    onSuccess: () => void;
}

export default function DataTransferActions({ type, onSuccess }: DataTransferActionsProps) {
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleExport = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/exports/${type}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${type}-export-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                alert('Export failed');
            }
        } catch (err) {
            console.error(err);
            alert('Network error during export');
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setError(null);

        try {
            const text = await file.text();
            const data = parseCSV(text);

            if (data.length === 0) {
                setError('No data found in the CSV file.');
                setImporting(false);
                return;
            }

            const token = localStorage.getItem('token');
            const res = await fetch(`/api/imports/${type}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data })
            });

            const result = await res.json();
            if (res.ok) {
                alert(result.message || 'Import successful');
                onSuccess();
            } else {
                setError(result.error || 'Import failed');
            }
        } catch (err) {
            console.error(err);
            setError('Failed to process the file.');
        } finally {
            setImporting(false);
            if (e.target) e.target.value = '';
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
                <input
                    type="file"
                    accept=".csv"
                    onChange={handleImport}
                    className="hidden"
                    id={`import-${type}`}
                    disabled={importing}
                />
                <label
                    htmlFor={`import-${type}`}
                    className={`btn btn-secondary flex items-center gap-2 cursor-pointer ${importing ? 'opacity-50 pointer-events-none' : ''}`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {importing ? 'Importing...' : 'Import CSV'}
                </label>
            </div>

            <button
                onClick={handleExport}
                className="btn btn-secondary flex items-center gap-2"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
            </button>

            {error && (
                <div className="text-xs text-danger-600 font-medium">
                    {error}
                </div>
            )}
        </div>
    );
}
