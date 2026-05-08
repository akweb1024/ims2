"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type FormSummary = {
  key: "invoice" | "proforma";
  name: string;
  description: string;
  actionCount: number;
  enabledCount: number;
};

export default function AutomationFormsIndexClient() {
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/automation/forms", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load automation forms");
        setForms(data.forms || []);
      } catch (err: any) {
        setError(err?.message || "Failed to load automation forms");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading forms…</div>;
  }
  if (error) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</div>;
  }

  return (
    <div className="space-y-4">
      {forms.map((form) => (
        <Link
          key={form.key}
          href={`/dashboard/automation/forms/${form.key}`}
          className="block rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-slate-300 hover:shadow-sm"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{form.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{form.description}</p>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</div>
              <div className="text-sm font-bold text-slate-900">
                {form.enabledCount}/{form.actionCount} enabled
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

