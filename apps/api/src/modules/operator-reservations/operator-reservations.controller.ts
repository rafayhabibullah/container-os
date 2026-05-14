import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Controller, Get, Patch, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { CurrentMember } from '../../common/decorators/current-member.decorator';
import { OperatorReservationsService } from './operator-reservations.service';

interface MemberContext { id: string; userId: string; role: string; organisationId: string; }

@ApiTags('organisations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganisationGuard)
@Controller('v1/organisations/:organisationId/reservations')
export class OperatorReservationsController {
  constructor(private service: OperatorReservationsService) {}

  @Get()
  list(
    @Param('organisationId') orgId: string,
    @Query('siteId') siteId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.listReservations(orgId, { siteId, status });
  }

  @Patch(':reservationId')
  updateStatus(
    @Param('organisationId') orgId: string,
    @Param('reservationId') reservationId: string,
    @Body() body: { status: string },
    @CurrentMember() member: MemberContext,
  ) {
    return this.service.updateReservationStatus(orgId, reservationId, body.status, member.userId);
  }

  @Post(':reservationId/agreement')
  createAgreement(
    @Param('organisationId') orgId: string,
    @Param('reservationId') reservationId: string,
    @Body() body: { billingCycle: 'monthly' | 'fixed_term'; language: 'de' | 'en'; pricingSnapshot: object },
    @CurrentMember() member: MemberContext,
  ) {
    return this.service.createAgreementFromReservation(orgId, reservationId, body, member.userId);
  }
}
