import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckoutService } from './checkout.service';
import { DomainException } from '@sitelager/domain-types';

const mockPrisma = {
  checkoutSession: {
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
  },
  reservationHold: { findFirst: vi.fn(), delete: vi.fn() },
  customer: { create: vi.fn() },
  contact: { create: vi.fn() },
  reservation: { create: vi.fn() },
};
const mockNotifications = { sendNotification: vi.fn().mockResolvedValue(undefined) };
const mockAudit = { record: vi.fn() };

const service = new CheckoutService(
  mockPrisma as any,
  mockNotifications as any,
  mockAudit as any,
);

const validSession = {
  id: 'chk_01',
  siteId: 'site_01',
  unitTypeId: 'ut_01',
  state: 'started',
  expiresAt: new Date(Date.now() + 60_000),
  metadata: { unitId: 'unit_01', startDate: new Date().toISOString() },
};

describe('CheckoutService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.checkoutSession.findUniqueOrThrow.mockResolvedValue(validSession);
    mockPrisma.reservationHold.findFirst.mockResolvedValue({
      id: 'hold_01',
      unitId: 'unit_01',
      lockToken: 'tok_01',
      expiresAt: new Date(Date.now() + 60_000),
    });
    mockPrisma.customer.create.mockResolvedValue({ id: 'cust_01' });
    mockPrisma.contact.create.mockResolvedValue({ id: 'con_01' });
    mockPrisma.reservation.create.mockResolvedValue({
      id: 'res_01',
      status: 'pending_signature',
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    mockPrisma.reservationHold.delete.mockResolvedValue({});
    mockPrisma.checkoutSession.update.mockResolvedValue({});
  });

  it('creates customer, contact, reservation and sends confirmation email', async () => {
    const result = await service.confirmCheckout('chk_01', {
      name: 'Anna Müller',
      email: 'anna@example.com',
      phone: '+49170123456',
      marketingConsent: false,
    });
    expect(result).toHaveProperty('reservationId', 'res_01');
    expect(mockPrisma.customer.create).toHaveBeenCalledOnce();
    expect(mockPrisma.contact.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: 'anna@example.com' }) }),
    );
    expect(mockNotifications.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'reservation.confirmed' }),
    );
  });

  it('throws when checkout session is expired', async () => {
    mockPrisma.checkoutSession.findUniqueOrThrow.mockResolvedValue({
      ...validSession,
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(
      service.confirmCheckout('chk_01', { name: 'X', email: 'x@x.com', phone: '', marketingConsent: false }),
    ).rejects.toBeInstanceOf(DomainException);
  });

  it('throws when reservation hold is missing or expired', async () => {
    mockPrisma.reservationHold.findFirst.mockResolvedValue(null);
    await expect(
      service.confirmCheckout('chk_01', { name: 'X', email: 'x@x.com', phone: '', marketingConsent: false }),
    ).rejects.toBeInstanceOf(DomainException);
  });
});
