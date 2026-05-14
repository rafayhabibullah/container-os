import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { ApiKeyService } from './api-key.service';
import { PrismaClient } from '@prisma/client';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganisationGuard)
@Controller('v1/organisations/:organisationId')
export class OrgWebhooksController {
  constructor(
    private readonly apiKeys: ApiKeyService,
    private readonly prisma: PrismaClient,
  ) {}

  @Get('webhooks')
  @ApiOperation({ summary: 'List webhook endpoints for the organisation' })
  async listWebhooks(@Param('organisationId') orgId: string) {
    const sites = await this.prisma.site.findMany({ where: { organisationId: orgId }, select: { id: true } });
    const siteIds = sites.map((s) => s.id);
    const clients = await this.prisma.apiClient.findMany({
      where: { siteIds: { hasSome: siteIds } },
      include: { endpoints: true },
    });
    return clients.flatMap((c) => c.endpoints);
  }

  @Post('webhooks')
  @ApiOperation({ summary: 'Register a webhook endpoint — creates a default client if needed' })
  async createWebhook(
    @Param('organisationId') orgId: string,
    @Body() body: { url: string; subscriptions: string[]; secret: string; clientId?: string },
  ) {
    let clientId = body.clientId;
    if (!clientId) {
      const sites = await this.prisma.site.findMany({ where: { organisationId: orgId }, select: { id: true } });
      const existing = await this.prisma.apiClient.findFirst({ where: { siteIds: { hasSome: sites.map((s) => s.id) } } });
      if (existing) {
        clientId = existing.id;
      } else {
        const created = await this.prisma.apiClient.create({ data: { name: 'default', scopes: [], siteIds: sites.map((s) => s.id) } });
        clientId = created.id;
      }
    }
    return this.prisma.webhookEndpoint.create({
      data: { clientId, url: body.url, subscriptions: body.subscriptions ?? [], secret: body.secret },
    });
  }

  @Delete('webhooks/:webhookId')
  @ApiOperation({ summary: 'Delete a webhook endpoint' })
  async deleteWebhook(@Param('webhookId') webhookId: string) {
    await this.prisma.webhookEndpoint.delete({ where: { id: webhookId } });
    return { ok: true };
  }

  @Get('api-keys')
  @ApiOperation({ summary: 'List API clients and keys' })
  listApiKeys(@Param('organisationId') orgId: string) {
    return this.apiKeys.listClients(orgId);
  }

  @Post('api-keys')
  @ApiOperation({ summary: 'Create API client — raw key returned once' })
  createApiKey(
    @Param('organisationId') orgId: string,
    @Body() body: { name: string; scopes: string[] },
  ) {
    return this.apiKeys.createClient(orgId, body);
  }

  @Delete('api-keys/:keyId')
  @ApiOperation({ summary: 'Revoke an API key' })
  revokeApiKey(@Param('keyId') keyId: string) {
    return this.apiKeys.revokeKey(keyId);
  }
}
