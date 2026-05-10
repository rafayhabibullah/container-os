import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class WebhookDeliveryService {
  constructor(private prisma: PrismaClient) {}

  computeSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  async enqueueDeliveries(eventType: string, payload: object): Promise<Array<{ deliveryId: string; endpointId: string }>> {
    const endpoints = await this.prisma.webhookEndpoint.findMany({ where: { status: 'active', subscriptions: { has: eventType } } });
    const results = [];
    for (const endpoint of endpoints) {
      const delivery = await this.prisma.webhookDelivery.create({ data: { endpointId: endpoint.id, eventType, payload, status: 'pending' } });
      results.push({ deliveryId: delivery.id, endpointId: endpoint.id });
    }
    return results;
  }
}
