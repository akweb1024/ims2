import { redirect } from 'next/navigation';

export default function LegacyNewSubscriptionRedirectPage() {
  redirect('/dashboard/crm/subscriptions/new');
}
