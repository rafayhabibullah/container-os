import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { TenantPortalService } from './tenant-portal.service';

@ApiTags('tenant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/tenant')
export class TenantPortalController {
  constructor(private service: TenantPortalService) {}

  @Get('agreements')
  listAgreements(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listMyAgreements(user.id);
  }

  @Get('agreements/:agreementId')
  getAgreement(@CurrentUser() user: AuthenticatedUser, @Param('agreementId') agreementId: string) {
    return this.service.getMyAgreement(user.id, agreementId);
  }

  @Get('invoices')
  listInvoices(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listMyInvoices(user.id);
  }

  @Get('mandates')
  listMandates(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listMyMandates(user.id);
  }

  @Post('move-out-requests')
  createMoveOutRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { agreementId: string; requestedDate: string },
  ) {
    return this.service.createMoveOutRequest(user.id, body.agreementId, body.requestedDate);
  }
}
