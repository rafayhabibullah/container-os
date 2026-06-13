export const TYPE_KEYS: Record<string, string> = {
  move_in:         'move_in',
  move_out:        'move_out',
  inspect_unit:    'inspect_unit',
  clean_unit:      'clean_unit',
  repair_unit:     'repair_unit',
  verify_document: 'verify_document',
  approve_booking: 'approve_booking',
  call_tenant:     'call_tenant',
  collect_payment: 'collect_payment',
  assign_access:   'assign_access',
  upload_contract: 'upload_contract',
  other:           'other',
};

export const PRIORITY_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  low:    { text: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
  normal: { text: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  high:   { text: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  urgent: { text: '#991b1b', bg: '#fef2f2', border: '#fecaca' },
};
