import { redirect } from 'next/navigation';
export default function NewUnitTypeRedirect({ params }: { params: { siteId: string } }) {
  redirect(`/sites/${params.siteId}#unit-types`);
}
