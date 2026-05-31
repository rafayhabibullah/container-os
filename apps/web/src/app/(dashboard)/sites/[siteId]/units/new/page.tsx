import { redirect } from 'next/navigation';
export default function NewUnitRedirect({ params }: { params: { siteId: string } }) {
  redirect(`/sites/${params.siteId}#units`);
}
