import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { WebhooksService } from './webhooks.service';

@Controller('operator/v1/developer')
@UseGuards(JwtAuthGuard)
export class WebhooksController {
  constructor(private webhooks: WebhooksService) {}

  @Post('api-keys')
  createApiKey(@Body() body: { clientId: string }) { return this.webhooks.createApiKey(body.clientId); }

  @Post('webhooks')
  createEndpoint(@Body() body: { clientId: string; url: string; subscriptions: string[] }) { return this.webhooks.createWebhookEndpoint(body.clientId, body.url, body.subscriptions); }
}
