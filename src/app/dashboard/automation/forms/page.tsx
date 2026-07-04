import AutomationFormsIndexClient from "@/components/dashboard/automation/AutomationFormsIndexClient";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AutomationFormsPage() {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <>
      <div className="mx-auto max-w-6xl space-y-4 p-6">
        <h1 className="text-2xl font-bold text-slate-900">Automation Forms</h1>
        <p className="text-sm text-slate-600">
          Super-admin form automation center: select a form module, then configure actions, notifications, and payload mapping.
        </p>
        <AutomationFormsIndexClient />
      </div>
    </>
  );
}

