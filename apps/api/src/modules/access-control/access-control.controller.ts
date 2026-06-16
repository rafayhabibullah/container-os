import { ApiTags } from '@nestjs/swagger';
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AccessControlService } from './access-control.service';

@ApiTags('operator')
@Controller()
export class AccessControlController {
  constructor(private accessControl: AccessControlService) {}

  @Post('operator/v1/access/credentials')
  @UseGuards(JwtAuthGuard)
  issue(@Body() body: { agreementId: string; credentialType: 'pin' | 'card' | 'app' }) { return this.accessControl.issueCredential(body.agreementId, body.credentialType); }

  @Post('operator/v1/access/credentials/:agreementId/release')
  @UseGuards(JwtAuthGuard)
  release(@Param('agreementId') agreementId: string) { return this.accessControl.releaseCredential(agreementId); }

  @Post('operator/v1/access/points/:id/remote-open')
  @UseGuards(JwtAuthGuard)
  remoteOpen(@CurrentUser() user: AuthenticatedUser) { return { opened: true, actorId: user.id, timestamp: new Date() }; }

  @Get('v1/organisations/:organisationId/access/credentials')
  @UseGuards(JwtAuthGuard, OrganisationGuard)
  listOrgCredentials(@Param('organisationId') organisationId: string) {
    return this.accessControl.listCredentials(organisationId);
  }

  @Post('v1/organisations/:organisationId/access/credentials/:agreementId/release')
  @UseGuards(JwtAuthGuard, OrganisationGuard)
  releaseOrgCredential(@Param('organisationId') organisationId: string, @Param('agreementId') agreementId: string) {
    return this.accessControl.releaseCredential(agreementId, organisationId);
  }

  @Post('v1/organisations/:organisationId/access/credentials/:agreementId/suspend')
  @UseGuards(JwtAuthGuard, OrganisationGuard)
  suspendOrgCredential(@Param('organisationId') organisationId: string, @Param('agreementId') agreementId: string) {
    return this.accessControl.suspendCredential(agreementId, organisationId);
  }

  @Post('v1/organisations/:organisationId/access/credentials/:agreementId/restore')
  @UseGuards(JwtAuthGuard, OrganisationGuard)
  restoreOrgCredential(@Param('organisationId') organisationId: string, @Param('agreementId') agreementId: string) {
    return this.accessControl.restoreCredential(agreementId, organisationId);
  }
}
