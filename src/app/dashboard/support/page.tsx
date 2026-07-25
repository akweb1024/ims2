import { redirect } from 'next/navigation';

// The old /dashboard/support page duplicated /dashboard/tickets with a broken
// response-shape handler and a staff-submit flow the API rejects. The tickets
// page is the canonical SupportTicket surface; keep this route as a redirect
// because GuidelineHelp and support-ticket notifications link to it.
export default function SupportRedirect() {
    redirect('/dashboard/tickets');
}
