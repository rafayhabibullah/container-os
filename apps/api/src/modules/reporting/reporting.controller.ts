import { ApiTags } from '@nestjs/swagger';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { ReportingService } from './reporting.service';

@ApiTags('operator')
@Controller('operator/v1/reports')
@UseGuards(JwtAuthGuard)
export class ReportingController {
  constructor(private reporting: ReportingService) {}

  @Get('occupancy')
  getOccupancy(@Query('siteIds') siteIds: string, @Query('from') from: string, @Query('to') to: string) {
    return this.reporting.getOccupancyReport(siteIds.split(','), new Date(from), new Date(to));
  }

  @Get('revenue')
  getRevenue(@Query('siteIds') siteIds: string, @Query('from') from: string, @Query('to') to: string) {
    return this.reporting.getRevenueReport(siteIds.split(','), new Date(from), new Date(to));
  }
}
