import InvoicingResetControl from "@/components/dashboard/super-admin/InvoicingResetControl";
import { getAuthenticatedUser } from "@/lib/auth";
import { AlertTriangle } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SuperAdminInvoicingResetPage() {
  const user = await getAuthenticatedUser();

  if (!user || user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <>
      <main className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="rounded-[2rem] border border-rose-200 bg-white p-6 shadow-xl shadow-rose-100/50">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-rose-100 p-3 text-rose-700">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-rose-600">
                    Super Admin Danger Zone
                  </p>
                  <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
                    Reset Invoicing Data
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-600">
                    Use this page only when you intentionally want a clean invoicing ledger across
                    every company. The reset requires typed confirmation and records an audit log.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <InvoicingResetControl />
        </div>
      </main>
    </>
  );
}
