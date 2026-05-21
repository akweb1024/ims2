"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

type InvoicingResetPreview = {
  invoiceCount: number;
  paymentCount: number;
  revenueTransactionCount: number;
  revenueClaimCount: number;
  expenseAllocationCount: number;
  financialRecordCount: number;
  journalEntryCount: number;
  dispatchOrderLinkCount: number;
  itProjectLinkCount: number;
  companyCounterCount: number;
  brandCounterCount: number;
};

type PreviewResponse = {
  confirmationPhrase: string;
  preview: InvoicingResetPreview;
};

const metricRows: Array<[keyof InvoicingResetPreview, string]> = [
  ["invoiceCount", "Invoices deleted"],
  ["paymentCount", "Invoice payments deleted"],
  ["revenueTransactionCount", "Revenue transactions deleted"],
  ["financialRecordCount", "Synced finance records deleted"],
  ["journalEntryCount", "Ledger postings deleted"],
  ["revenueClaimCount", "Revenue claims removed"],
  ["expenseAllocationCount", "Expense allocations removed"],
];

export default function InvoicingResetControl() {
  const [data, setData] = useState<PreviewResponse | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadPreview = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/super-admin/invoicing-reset", {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || payload.error || "Failed to load reset preview.");
      }

      setData(payload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load reset preview.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const handleReset = async () => {
    if (!data || confirmation !== data.confirmationPhrase) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/super-admin/invoicing-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || payload.error || "Invoicing reset failed.");
      }

      toast.success(payload.message || "Invoicing data reset.");
      setConfirmation("");
      await loadPreview();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invoicing reset failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const canReset = Boolean(data && confirmation === data.confirmationPhrase && !submitting);

  return (
    <Card className="overflow-hidden border-danger-200 bg-danger-50/40 shadow-sm">
      <CardHeader className="border-b border-danger-100 bg-white/70 pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-black text-danger-900">
          <AlertTriangle size={20} className="text-danger-600" />
          Reset Invoicing Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 p-6">
        <p className="text-sm font-medium leading-relaxed text-danger-900/80">
          This global reset removes invoices and invoice-linked finance history for every company.
          Dispatch orders and IT projects survive, but their invoice links are cleared before invoice
          records are erased.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 rounded-2xl border border-danger-100 bg-white px-4 py-5 text-sm font-bold text-danger-700">
            <Loader2 size={16} className="animate-spin" />
            Checking reset scope...
          </div>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 gap-2 rounded-2xl border border-danger-100 bg-white p-4 md:grid-cols-2">
              {metricRows.map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-3 rounded-xl bg-danger-50/60 px-3 py-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-danger-700">
                    {label}
                  </span>
                  <span className="font-mono text-sm font-black text-danger-950">
                    {data.preview[key]}
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-relaxed text-amber-900">
              Counters reset to <span className="font-mono">1</span> for{" "}
              <span className="font-mono">{data.preview.companyCounterCount}</span> companies and{" "}
              <span className="font-mono">{data.preview.brandCounterCount}</span> brands. Existing
              dispatch links cleared:{" "}
              <span className="font-mono">{data.preview.dispatchOrderLinkCount}</span>. Existing IT
              project invoice links cleared:{" "}
              <span className="font-mono">{data.preview.itProjectLinkCount}</span>.
            </div>

            <label className="block space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-danger-800">
                Type this phrase to unlock reset
              </span>
              <code className="block rounded-xl border border-danger-200 bg-white px-3 py-2 text-xs font-black text-danger-900">
                {data.confirmationPhrase}
              </code>
              <input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl border border-danger-200 bg-white px-4 py-3 font-mono text-sm font-bold text-danger-950 outline-none transition focus:border-danger-500 focus:ring-4 focus:ring-danger-100"
                placeholder={data.confirmationPhrase}
              />
            </label>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleReset}
                disabled={!canReset}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-danger-700 px-4 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-danger-200 transition hover:bg-danger-800 disabled:cursor-not-allowed disabled:bg-danger-300 disabled:shadow-none"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                Reset All Invoicing Data
              </button>
              <button
                type="button"
                onClick={loadPreview}
                disabled={loading || submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-danger-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-danger-800 transition hover:bg-danger-50 disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Refresh Counts
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={loadPreview}
            className="inline-flex items-center gap-2 rounded-xl border border-danger-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-danger-800"
          >
            <RefreshCw size={16} />
            Retry Preview
          </button>
        )}
      </CardContent>
    </Card>
  );
}
