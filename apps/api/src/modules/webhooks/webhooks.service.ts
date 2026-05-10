import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  constructor(private prisma: PrismaClient) {}

  async createApiKey(clientId: string) {
    const rawKey = `sk_live_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const key = await this.prisma.apiKey.create({ data: { clientId, keyHash } });
    return { apiKeyId: key.id, key: rawKey };
  }

  async createWebhookEndpoint(clientId: string, url: string, subscriptions: string[]) {
    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
    return this.prisma.webhookEndpoint.create({ data: { clientId, url, secret, subscriptions } });
  }
}
