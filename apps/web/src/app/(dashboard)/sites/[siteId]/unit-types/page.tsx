import { redirect } from 'next/navigation';
export default function UnitTypesRedirect({ params }: { params: { siteId: string } }) {
  redirect(`/sites/${params.siteId}#unit-types`);
}
