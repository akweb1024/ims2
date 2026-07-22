'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FiCpu, FiRefreshCw, FiChevronDown, FiChevronRight, FiArrowLeft } from 'react-icons/fi';

/**
 * Audit log of write actions proposed through the ims2 MCP server — layer 2 of
 * the two-layer approval. Approval itself happens in the MCP conversation;
 * this page makes every proposal and its outcome visible to admins.
 */

interface ProposalRow {
  id: string;
  action: string;
  status: 'PENDING' | 'EXECUTED' | 'REJECTED' | 'FAILED' | string;
  instruction: string;
  preview: string;
  result: unknown;
  error: string | null;
  proposedBy: string;
  createdAt: string;
  decidedAt: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  EXECUTED: 'bg-green-50 text-green-700 border-green-200',
  REJECTED: 'bg-gray-100 text-gray-600 border-gray-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
};

const FILTERS = ['ALL', 'PENDING', 'EXECUTED', 'REJECTED', 'FAILED'] as const;

export default function McpLogPage() {
  const [rows, setRows] = useState<ProposalRow[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = filter === 'ALL' ? '' : `?status=${filter}`;
      const res = await fetch(`/api/kra/mcp-proposals${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load MCP proposals');
      setRows(data.proposals ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load MCP proposals');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiCpu className="text-indigo-600" /> MCP Activity Log
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Every KRA write proposed through the AI (MCP) assistant — with its preview, decision and outcome. Approval happens in
            the assistant conversation; nothing executes without it.
          </p>
        </div>
        <Link
          href="/dashboard/hr-management/kra"
          className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 whitespace-nowrap mt-1"
        >
          <FiArrowLeft /> KRA console
        </Link>
      </header>

      <div className="flex items-center gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium border ${
              filter === f ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
        <button
          onClick={() => void load()}
          className="ml-auto inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          title="Refresh"
        >
          <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {!loading && !error && rows.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 px-6 py-10 text-center text-sm text-gray-500">
          No MCP proposals yet. They will appear here the moment the assistant proposes a KRA change.
        </div>
      )}

      <div className="space-y-3">
        {rows.map((r) => {
          const expanded = open[r.id] ?? false;
          return (
            <div key={r.id} className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <button
                onClick={() => setOpen((o) => ({ ...o, [r.id]: !expanded }))}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
              >
                {expanded ? <FiChevronDown className="shrink-0 text-gray-400" /> : <FiChevronRight className="shrink-0 text-gray-400" />}
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[r.status] ?? STATUS_STYLES.REJECTED}`}
                >
                  {r.status}
                </span>
                <span className="truncate text-sm text-gray-800">{r.instruction}</span>
                <span className="ml-auto shrink-0 text-xs text-gray-400">
                  {r.proposedBy} · {new Date(r.createdAt).toLocaleString()}
                </span>
              </button>
              {expanded && (
                <div className="border-t border-gray-100 px-4 py-3 space-y-3">
                  <pre className="whitespace-pre-wrap rounded-md bg-gray-50 p-3 text-xs text-gray-700 overflow-x-auto">{r.preview}</pre>
                  {r.error && <div className="text-xs text-red-600">Error: {r.error}</div>}
                  {r.result != null && (
                    <pre className="whitespace-pre-wrap rounded-md bg-gray-50 p-3 text-xs text-gray-700 overflow-x-auto">
                      {JSON.stringify(r.result, null, 2)}
                    </pre>
                  )}
                  {r.decidedAt && <div className="text-xs text-gray-400">Decided: {new Date(r.decidedAt).toLocaleString()}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
