import { redirect } from 'next/navigation';

// Peer-review consolidation: the legacy editorial review queue (backed by the
// retired Review model) is replaced by the Reviewer Hub. Keep this route as a
// redirect because old review-assignment notifications link to it.
export default function EditorialReviewsRedirect() {
    redirect('/dashboard/reviewer');
}
