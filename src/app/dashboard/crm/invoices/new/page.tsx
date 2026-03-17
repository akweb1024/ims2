"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import CreateInvoiceModal from "@/components/dashboard/CreateInvoiceModal";

export default function NewInvoicePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "CUSTOMER";

  return (
    <DashboardLayout userRole={userRole}>
      <CreateInvoiceModal
        isOpen={true}
        onClose={() => router.push("/dashboard/crm/invoices")}
        onSuccess={() => router.push("/dashboard/crm/invoices")}
        renderMode="page"
      />
    </DashboardLayout>
  );
}
