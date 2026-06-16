import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { TenantPortalService } from './tenant-portal.service';

@ApiTags('tenant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/tenant')
export class TenantPortalController {
  constructor(private service: TenantPortalService) {}

  @Get('dashboard')
  getDashboardSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getDashboardSummary(user.id);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getMyProfile(user.id);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() body: { name?: string; phone?: string }) {
    return this.service.updateMyProfile(user.id, body);
  }

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

  @Post('invoices/:invoiceId/pay')
  payInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('invoiceId') invoiceId: string,
    @Body() body: { redirectUrl?: string },
  ) {
    return this.service.createMyInvoicePayment(user.id, invoiceId, body.redirectUrl);
  }

  @Get('mandates')
  listMandates(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listMyMandates(user.id);
  }

  @Post('agreements/:agreementId/sign')
  signAgreement(@CurrentUser() user: AuthenticatedUser, @Param('agreementId') agreementId: string) {
    return this.service.signMyAgreement(user.id, agreementId);
  }

  @Post('move-out-requests')
  createMoveOutRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { agreementId: string; requestedDate: string },
  ) {
    return this.service.createMoveOutRequest(user.id, body.agreementId, body.requestedDate);
  }

  @Post('incidents')
  reportIncident(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { agreementId: string; type: string; description: string },
  ) {
    return this.service.reportIncident(user.id, body);
  }
}
