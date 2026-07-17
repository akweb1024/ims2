import { redirect } from 'next/navigation';

// Goal verification lives in the Review Inbox's Goals tab, which renders the
// same /api/kra/verify queue with the full proof list and verification
// timeline. This stub only protects old bookmarks and notification links.
export default function VerifyPage() {
    redirect('/dashboard/review-inbox?tab=goals');
}
