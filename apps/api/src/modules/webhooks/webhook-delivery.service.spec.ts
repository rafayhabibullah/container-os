import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebhookDeliveryService } from './webhook-delivery.service';
import * as crypto from 'crypto';

const mockPrisma = {
  webhookEndpoint: { findMany: vi.fn() },
  webhookDelivery: { create: vi.fn(), update: vi.fn() },
};
const service = new WebhookDeliveryService(mockPrisma as any);

describe('WebhookDeliveryService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('computes HMAC-SHA256 signature correctly', () => {
    const payload = JSON.stringify({ type: 'agreement.activated' });
    const secret = 'whsec_test123';
    const sig = service.computeSignature(payload, secret);
    expect(sig).toBe(crypto.createHmac('sha256', secret).update(payload).digest('hex'));
  });

  it('enqueues delivery for matching endpoints', async () => {
    mockPrisma.webhookEndpoint.findMany.mockResolvedValue([{ id: 'ep_01', url: 'https://example.com/wh', secret: 'sec_01', subscriptions: ['agreement.activated'] }]);
    mockPrisma.webhookDelivery.create.mockResolvedValue({ id: 'del_01' });
    const deliveries = await service.enqueueDeliveries('agreement.activated', { agreementId: 'agr_01' });
    expect(deliveries).toHaveLength(1);
  });

  it('returns empty when DB finds no matching endpoints (subscription filter applied by DB)', async () => {
    // DB WHERE clause `subscriptions: { has: eventType }` filters out non-matching endpoints
    mockPrisma.webhookEndpoint.findMany.mockResolvedValue([]);
    const deliveries = await service.enqueueDeliveries('agreement.activated', {});
    expect(deliveries).toHaveLength(0);
    expect(mockPrisma.webhookDelivery.create).not.toHaveBeenCalled();
  });
});
