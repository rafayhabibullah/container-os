import { ApiTags } from '@nestjs/swagger';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { AuditService } from './audit.service';

@ApiTags('operator')
@Controller('operator/v1/audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  getAuditTrail(
    @Query('subjectType') subjectType: string,
    @Query('subjectId') subjectId: string,
    @Query('siteId') siteId?: string,
  ) {
    return this.auditService.getAuditTrail(subjectType, subjectId, siteId);
  }
}
