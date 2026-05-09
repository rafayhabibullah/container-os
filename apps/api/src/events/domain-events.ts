export interface DomainEventMeta {
  workspaceId: string;
  siteId?: string;
  actorId?: string;
  occurredAt: Date;
}

export interface DomainEvent<T = unknown> {
  type: string;
  payload: T;
  meta: DomainEventMeta;
}

export const Events = {
  RESERVATION_CONFIRMED: 'reservation.confirmed',
  AGREEMENT_ACTIVATED: 'agreement.activated',
  AGREEMENT_TERMINATED: 'agreement.terminated',
  INVOICE_CREATED: 'invoice.created',
  INVOICE_OVERDUE: 'invoice.overdue',
  INVOICE_PAID: 'invoice.paid',
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  ACCESS_CREDENTIAL_ISSUED: 'access.credential.issued',
  ACCESS_LOCKOUT_ACTIVATED: 'access.lockout.activated',
  ACCESS_LOCKOUT_DEACTIVATED: 'access.lockout.deactivated',
  ACCESS_DENIED: 'access.denied',
} as const;
