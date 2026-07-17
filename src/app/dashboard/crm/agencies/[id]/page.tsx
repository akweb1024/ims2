import { redirect } from 'next/navigation';

// The agency profile merged into the customer detail page, which carries the
// agency-specific machinery (performance tab, assigned institutions,
// commission terms, role-gated discount editing). This stub protects old
// bookmarks. The /edit subroute stays real — it is the only surface that can
// write agencyDetails (discountRate/commissionTerms/territory).
export default async function AgencyDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    redirect(`/dashboard/customers/${id}`);
}
