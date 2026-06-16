import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { PlatformService } from './platform.service';
import { PlatformTokenGuard } from './platform-token.guard';

@UseGuards(PlatformTokenGuard)
@Controller('platform/v1')
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get('dashboard') dashboard() { return this.platform.dashboard(); }
  @Get('organisations') organisations() { return this.platform.listOrganisations(); }
  @Get('jobs/failed') failedJobs() { return this.platform.listFailedJobs(); }
  @Post('jobs/:id/retry') retryJob(@Param('id') id: string) { return this.platform.retryJob(id); }
  @Get('feature-flags') flags() { return this.platform.listFlags(); }
  @Put('feature-flags/:key') flag(@Param('key') key: string, @Body() body: { enabled: boolean; scope?: object }) { return this.platform.upsertFlag(key, body.enabled, body.scope); }
  @Post('support-access') supportAccess(@Body() body: { actorId: string; organisationId: string; reason: string; expiresAt: string }) {
    return this.platform.grantSupportAccess(body.actorId, body.organisationId, body.reason, new Date(body.expiresAt));
  }
}
