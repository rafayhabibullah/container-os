import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/api-route-helpers';
import { backendApi } from '@/lib/backend-url';

export async function POST(request: NextRequest) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  // Forward the multipart form data as-is to the backend
  const formData = await request.formData();
  const backendForm = new FormData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ message: 'No file provided' }, { status: 400 });
  backendForm.append('file', file, file.name);

  const res = await fetch(
    backendApi(`/v1/organisations/${auth.payload.organisationId}/inspection-photos`),
    { method: 'POST', headers: { Authorization: `Bearer ${auth.token}` }, body: backendForm },
  );
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
