import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationsService } from './notifications.service';

const mockPrisma = {
  outboundMessage: { create: vi.fn().mockResolvedValue({ id: 'msg_01' }), update: vi.fn() },
  contact: { findFirst: vi.fn().mockResolvedValue({ email: 'tenant@example.com', phone: '+491234567' }) },
  notificationPreference: { findFirst: vi.fn().mockResolvedValue(null) },
};
const mockRenderer = { render: vi.fn().mockResolvedValue({ subject: 'Invoice overdue', body: '<p>Pay now</p>' }) };
const mockEmail = { send: vi.fn().mockResolvedValue({ messageId: 'mid_01' }) };
const mockSms = { send: vi.fn().mockResolvedValue({ messageId: 'sms_01' }) };
const mockPush = { send: vi.fn().mockResolvedValue({ messageId: 'push_01' }) };
const mockEventBus = { on: vi.fn(), emit: vi.fn() };
const service = new NotificationsService(mockPrisma as any, mockRenderer as any, mockEmail as any, mockEventBus as any, mockSms as any, mockPush as any);

describe('NotificationsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.outboundMessage.create.mockResolvedValue({ id: 'msg_01' });
    mockPrisma.contact.findFirst.mockResolvedValue({ email: 'tenant@example.com', phone: '+491234567' });
    mockPrisma.notificationPreference.findFirst.mockResolvedValue(null);
    mockRenderer.render.mockResolvedValue({ subject: 'Invoice overdue', body: '<p>Pay now</p>' });
  });

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
    expect(mockPrisma.outboundMessage.create).not.toHaveBeenCalled();
  });

  it('checks preference by recipient, eventType, and channel', async () => {
    await service.sendNotification({ recipientId: 'cust_01', locale: 'de', eventType: 'invoice.paid', channel: 'email', vars: {} });
    expect(mockPrisma.notificationPreference.findFirst).toHaveBeenCalledWith({ where: { userId: 'cust_01', eventType: 'invoice.paid', channel: 'email' } });
  });

  it('sends via sms channel when enabled', async () => {
    await service.sendNotification({ recipientId: 'cust_01', locale: 'de', eventType: 'invoice.overdue', channel: 'sms', vars: {} });
    expect(mockSms.send).toHaveBeenCalledWith({ to: '+491234567', body: '<p>Pay now</p>' });
    expect(mockEmail.send).not.toHaveBeenCalled();
  });

  it('skips sms when disabled via preference', async () => {
    mockPrisma.notificationPreference.findFirst.mockResolvedValueOnce({ enabled: false });
    await service.sendNotification({ recipientId: 'cust_01', locale: 'de', eventType: 'invoice.overdue', channel: 'sms', vars: {} });
    expect(mockSms.send).not.toHaveBeenCalled();
  });

  it('sends via push channel when enabled', async () => {
    await service.sendNotification({ recipientId: 'cust_01', locale: 'de', eventType: 'invoice.overdue', channel: 'push', vars: {} });
    expect(mockPush.send).toHaveBeenCalledWith({ to: 'cust_01', title: 'Invoice overdue', body: '<p>Pay now</p>' });
  });
});
