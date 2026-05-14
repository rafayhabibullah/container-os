import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class ApiKeyService {
  constructor(private readonly prisma: PrismaClient) {}

  async listClients(orgId: string) {
    // ApiClient is scoped to siteIds; find clients that include any site of this org
    const sites = await this.prisma.site.findMany({ where: { organisationId: orgId }, select: { id: true } });
    const siteIds = sites.map((s) => s.id);
    return this.prisma.apiClient.findMany({
      where: { siteIds: { hasSome: siteIds } },
      include: { keys: { where: { status: 'active' } } },
    });
  }

  async createClient(orgId: string, data: { name: string; scopes: string[] }) {
    const sites = await this.prisma.site.findMany({ where: { organisationId: orgId }, select: { id: true } });
    const siteIds = sites.map((s) => s.id);
    const client = await this.prisma.apiClient.create({
      data: { name: data.name, scopes: data.scopes, siteIds },
    });
    const rawKey = `sl_${randomBytes(32).toString('hex')}`;
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    await this.prisma.apiKey.create({
      data: { clientId: client.id, keyHash, expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), status: 'active' },
    });
    return { client, rawKey };
  }

  async revokeKey(keyId: string) {
    await this.prisma.apiKey.update({ where: { id: keyId }, data: { status: 'revoked' } });
  }
}
