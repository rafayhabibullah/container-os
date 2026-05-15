import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { Badge } from '@sitelager/ui';
import { Search } from 'lucide-react';

interface DocumentRow {
  id: string;
  kind: string;
  subjectType: string;
  subjectId: string;
  locale: string | null;
  createdAt: string;
}

const KIND_VARIANT: Record<string, 'default' | 'success' | 'outline'> = {
  contract: 'success',
  invoice: 'default',
  id_document: 'outline',
};

export default async function DocumentsPage() {
  const user = await requireAuth();
  const documents = await serverFetch<DocumentRow[]>(
    `/v1/organisations/${user.organisationId}/documents`,
  ).catch(() => [] as DocumentRow[]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Documents</h1>
          <p className="text-sm text-slate-400 mt-0.5">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm text-slate-400">Search documents…</span>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm text-slate-400">No documents stored yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Kind', 'Subject', 'Locale', 'Date'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-slate-400 font-semibold uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documents.map((doc, i) => (
                <tr key={doc.id}
                  className={`border-b border-slate-100 last:border-0 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <td className="px-4 py-3">
                    <Badge variant={KIND_VARIANT[doc.kind] ?? 'default'}>{doc.kind}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{doc.subjectType}</td>
                  <td className="px-4 py-3 text-slate-500">{doc.locale ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(doc.createdAt).toLocaleDateString('de-DE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
