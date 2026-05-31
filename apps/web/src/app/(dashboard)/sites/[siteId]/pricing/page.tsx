import { redirect } from 'next/navigation';
export default function PricingRedirect({ params }: { params: { siteId: string } }) {
  redirect(`/sites/${params.siteId}#pricing`);
}
