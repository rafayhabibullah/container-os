import { redirect } from 'next/navigation';

export default function LegacyBillingPage({
  searchParams,
}: {
  searchParams: { checkout?: string; plan?: string; interval?: string };
}) {
  const params = new URLSearchParams();
  if (searchParams.checkout) params.set('checkout', searchParams.checkout);
  if (searchParams.plan) params.set('plan', searchParams.plan);
  if (searchParams.interval) params.set('interval', searchParams.interval);
  const query = params.toString();
  redirect(`/settings/billing${query ? `?${query}` : ''}`);
}
