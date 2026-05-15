export const TYPE_LABELS: Record<string, string> = {
  move_in:         'Move-in',
  move_out:        'Move-out',
  inspect_unit:    'Inspect unit',
  clean_unit:      'Clean unit',
  repair_unit:     'Repair unit',
  verify_document: 'Verify document',
  approve_booking: 'Approve booking',
  call_tenant:     'Call tenant',
  collect_payment: 'Collect payment',
  assign_access:   'Assign access',
  upload_contract: 'Upload contract',
  other:           'Other',
};

export const PRIORITY_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  low:    { text: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
  normal: { text: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  high:   { text: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  urgent: { text: '#991b1b', bg: '#fef2f2', border: '#fecaca' },
};
