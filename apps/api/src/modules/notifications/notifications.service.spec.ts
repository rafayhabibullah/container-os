import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationsService } from './notifications.service';

const mockPrisma = {
  outboundMessage: { create: vi.fn().mockResolvedValue({ id: 'msg_01' }), update: vi.fn() },
  contact: { findFirst: vi.fn().mockResolvedValue({ email: 'tenant@example.com' }) },
  notificationPreference: { findFirst: vi.fn().mockResolvedValue(null) },
};
const mockRenderer = { render: vi.fn().mockResolvedValue({ subject: 'Invoice overdue', body: '<p>Pay now</p>' }) };
const mockEmail = { send: vi.fn().mockResolvedValue({ messageId: 'mid_01' }) };
const mockEventBus = { on: vi.fn(), emit: vi.fn() };
const service = new NotificationsService(mockPrisma as any, mockRenderer as any, mockEmail as any, mockEventBus as any);

describe('NotificationsService', () => {
  beforeEach(() => { vi.clearAllMocks(); mockPrisma.outboundMessage.create.mockResolvedValue({ id: 'msg_01' }); mockPrisma.contact.findFirst.mockResolvedValue({ email: 'tenant@example.com' }); mockPrisma.notificationPreference.findFirst.mockResolvedValue(null); mockRenderer.render.mockResolvedValue({ subject: 'Invoice overdue', body: '<p>Pay now</p>' }); });

  it('sends email and records OutboundMessage', async () => {
    await service.sendNotification({ recipientId: 'cust_01', locale: 'de', eventType: 'invoice.overdue', channel: 'email', vars: { number: 'INV-001', name: 'Anna' } });
    expect(mockRenderer.render).toHaveBeenCalled();
    expect(mockEmail.send).toHaveBeenCalled();
    expect(mockPrisma.outboundMessage.create).toHaveBeenCalled();
  });

  it('skips send when tenant has opted out', async () => {
    mockPrisma.notificationPreference.findFirst.mockResolvedValueOnce({ enabled: false });
    await service.sendNotification({ recipientId: 'cust_01', locale: 'de', eventType: 'invoice.overdue', channel: 'email', vars: {} });
    expect(mockEmail.send).not.toHaveBeenCalled();
  });
});
