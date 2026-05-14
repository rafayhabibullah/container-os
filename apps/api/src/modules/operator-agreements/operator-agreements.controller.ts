import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { CurrentMember } from '../../common/decorators/current-member.decorator';
import { OperatorAgreementsService } from './operator-agreements.service';

interface MemberContext { id: string; userId: string; role: string; organisationId: string; }

@ApiTags('organisations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganisationGuard)
@Controller('v1/organisations/:organisationId/agreements')
export class OperatorAgreementsController {
  constructor(private service: OperatorAgreementsService) {}

  @Get()
  list(
    @Param('organisationId') orgId: string,
    @Query('siteId') siteId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.listAgreements(orgId, { siteId, status });
  }

  @Get(':agreementId')
  getOne(@Param('organisationId') orgId: string, @Param('agreementId') agreementId: string) {
    return this.service.getAgreement(orgId, agreementId);
  }

  @Post(':agreementId/send')
  send(
    @Param('organisationId') orgId: string,
    @Param('agreementId') agreementId: string,
    @Body() body: { personIds: string[] },
    @CurrentMember() member: MemberContext,
  ) {
    return this.service.sendForSignature(orgId, agreementId, body.personIds, member.userId);
  }

  @Post(':agreementId/terminate')
  terminate(
    @Param('organisationId') orgId: string,
    @Param('agreementId') agreementId: string,
    @Body() body: { requestedDate: string; operatorNote?: string },
    @CurrentMember() member: MemberContext,
  ) {
    return this.service.requestTermination(orgId, agreementId, new Date(body.requestedDate), body.operatorNote, member.userId);
  }
}
