"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import CreateInvoiceModal from "@/components/dashboard/CreateInvoiceModal";

export default function NewInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "CUSTOMER";
  const editId = searchParams.get("editId") || searchParams.get("invoiceId") || undefined;
  const returnTo = searchParams.get("returnTo") || "/dashboard/crm/invoices";

  return (
    <>
      <CreateInvoiceModal
        isOpen={true}
        onClose={() => router.push(returnTo)}
        onSuccess={() => router.push(returnTo)}
        editId={editId}
        renderMode="page"
      />
    </>
  );
}
