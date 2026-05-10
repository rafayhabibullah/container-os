import { ApiTags } from '@nestjs/swagger';
import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CrmLeadsService } from './crm-leads.service';

@ApiTags('public', 'operator')
@Controller()
export class CrmLeadsController {
  constructor(private crmLeads: CrmLeadsService) {}

  @Post('public/v1/leads')
  createLead(@Body() body: { siteId: string; name: string; email: string; phone?: string; source: string; intent?: string }) {
    return this.crmLeads.createLead({ ...body, source: body.source ?? 'storefront' });
  }

  @Get('operator/v1/leads')
  @UseGuards(JwtAuthGuard)
  getLeads(@Query('siteId') siteId: string, @Query('status') status?: string) {
    return this.crmLeads.getLeads(siteId, status);
  }
}
