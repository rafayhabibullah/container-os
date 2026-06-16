import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentMember } from '../../common/decorators/current-member.decorator';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { RentalLifecycleService } from './rental-lifecycle.service';

@UseGuards(JwtAuthGuard, OrganisationGuard)
@Controller('v1/organisations/:organisationId/rentals')
export class RentalLifecycleController {
  constructor(private readonly lifecycle: RentalLifecycleService) {}

  @Get(':agreementId/readiness')
  readiness(@Param('agreementId') agreementId: string) {
    return this.lifecycle.readiness(agreementId);
  }

  @Post(':agreementId/activate')
  activate(
    @Param('agreementId') agreementId: string,
    @Body() body: { requireMoveInInspection?: boolean },
    @CurrentMember() member: { userId: string },
  ) {
    return this.lifecycle.activateAndRelease(agreementId, member.userId, body.requireMoveInInspection !== false);
  }

  @Get(':agreementId/documents')
  documents(@Param('agreementId') agreementId: string) {
    return this.lifecycle.agreementDocuments(agreementId);
  }
}
