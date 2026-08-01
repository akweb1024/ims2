import { redirect } from 'next/navigation';

// The IT service desk is retired. It raised ITTask records against a priced service
// catalogue (ITServiceDefinition) — a second, parallel way to ask IT for something, sitting
// one nav line away from Support Desk, which routes a request to any department including
// IT. Support Desk is the surviving surface; the catalogue and this portal are gone.
// Kept as a redirect because the staff portal and old bookmarks still point here.
export default function ServiceDeskRedirect() {
    redirect('/dashboard/support-desk');
}
