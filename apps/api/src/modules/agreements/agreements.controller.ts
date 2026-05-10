import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AgreementsService } from './agreements.service';

@Controller()
export class AgreementsController {
  constructor(private agreements: AgreementsService) {}

  @Post('operator/v1/agreements/draft')
  @UseGuards(JwtAuthGuard)
  draft(@Body() body: { reservationId: string; billingCycle: string; language: string; pricingSnapshot: object }) {
    return this.agreements.draftAgreement({ ...body, billingCycle: body.billingCycle as any, language: body.language as any });
  }

  @Post('operator/v1/agreements/:id/activate')
  @UseGuards(JwtAuthGuard)
  activate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.agreements.activateAgreement(id, user.id); }

  @Post('tenant/v1/agreements/:id/sign')
  @UseGuards(JwtAuthGuard)
  sign(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.agreements.signAgreement(id, user.id); }

  @Post('tenant/v1/agreements/:id/move-out-request')
  @UseGuards(JwtAuthGuard)
  moveOutRequest(@Param('id') id: string, @Body() body: { requestedDate: string }) { return this.agreements.requestMoveOut(id, new Date(body.requestedDate)); }
}
