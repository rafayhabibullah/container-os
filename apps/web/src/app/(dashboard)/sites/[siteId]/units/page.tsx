import { redirect } from 'next/navigation';
export default function UnitsRedirect({ params }: { params: { siteId: string } }) {
  redirect(`/sites/${params.siteId}#units`);
}
