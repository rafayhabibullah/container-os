import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AccessControlService } from './access-control.service';

@Controller()
export class AccessControlController {
  constructor(private accessControl: AccessControlService) {}

  @Post('operator/v1/access/credentials')
  @UseGuards(JwtAuthGuard)
  issue(@Body() body: { agreementId: string; credentialType: 'pin' | 'card' | 'app' }) { return this.accessControl.issueCredential(body.agreementId, body.credentialType); }

  @Post('operator/v1/access/points/:id/remote-open')
  @UseGuards(JwtAuthGuard)
  remoteOpen(@CurrentUser() user: AuthenticatedUser) { return { opened: true, actorId: user.id, timestamp: new Date() }; }
}
