'use client';

import { useState } from 'react';
import InspectionsTable from './InspectionsTable';
import InspectionComplete from './InspectionComplete';

interface InspectionRow {
  id: string;
  siteId: string | null;
  siteName?: string | null;
  unitId: string;
  unitCode?: string | null;
  kind: string;
  result: string | null;
  checklist: { code: string; label: string; result: string; note?: string }[] | null;
  notes: string | null;
  depositDeduction: number | null;
  completedAt: string | null;
  createdAt: string;
  photoIds?: string[];
}

export default function InspectionsPageClient({ inspections }: { inspections: InspectionRow[] }) {
  const [selectedInspection, setSelectedInspection] = useState<InspectionRow | null>(null);

  return (
    <>
      <InspectionsTable
        inspections={inspections}
        onContinue={(insp) => setSelectedInspection(insp)}
      />
      {selectedInspection && (
        <InspectionComplete
          inspection={selectedInspection}
          onClose={() => setSelectedInspection(null)}
        />
      )}
    </>
  );
}
