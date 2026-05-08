import DashboardLayout from "@/components/dashboard/DashboardLayout";
import AutomationFormDetailClient from "@/components/dashboard/automation/AutomationFormDetailClient";
import { getAuthenticatedUser } from "@/lib/auth";
import { redirect } from "next/navigation";

const SUPPORTED_FORMS = new Set(["invoice", "proforma"]);

export const dynamic = "force-dynamic";

export default async function AutomationFormDetailPage({
  params,
}: {
  params: Promise<{ formKey: string }>;
}) {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const { formKey } = await params;
  if (!SUPPORTED_FORMS.has(formKey)) {
    redirect("/dashboard/automation/forms");
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-4 p-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {formKey === "invoice" ? "Invoice" : "Proforma"} Automation
        </h1>
        <p className="text-sm text-slate-600">
          Configure action catalog entries, trigger conditions, and key:value payload mapping for this form.
        </p>
        <AutomationFormDetailClient formKey={formKey as "invoice" | "proforma"} />
      </div>
    </DashboardLayout>
  );
}

