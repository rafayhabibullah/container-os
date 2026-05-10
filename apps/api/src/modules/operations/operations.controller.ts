import { ApiTags } from '@nestjs/swagger';
import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OperationsService } from './operations.service';
import { InspectionService } from './inspection.service';

@ApiTags('operator')
@Controller('operator/v1')
@UseGuards(JwtAuthGuard)
export class OperationsController {
  constructor(private operations: OperationsService, private inspection: InspectionService) {}

  @Post('tasks')
  createTask(@Body() body: { siteId: string; title: string; assigneeId?: string; dueAt?: string }) {
    return this.operations.createTask({ ...body, dueAt: body.dueAt ? new Date(body.dueAt) : undefined });
  }

  @Post('inspections')
  createInspection(@Body() body: { unitId: string; siteId: string; kind: string; checklist: any[]; photoIds?: string[] }) {
    return this.inspection.createInspectionRun(body.unitId, body.siteId, body.kind, body.checklist, body.photoIds);
  }

  @Post('incidents')
  createIncident(@Body() body: { siteId: string; severity: string; type: string }) { return this.operations.createIncident(body); }

  @Patch('incidents/:id/resolve')
  resolveIncident(@Param('id') id: string, @Body() body: { resolutionNote: string }) { return this.operations.resolveIncident(id, body.resolutionNote); }

  @Get('incidents')
  getOpenIncidents(@Query('siteId') siteId: string) { return this.operations.getOpenIncidents(siteId); }

  @Post('transfers')
  createTransfer(@Body() body: { fromUnitId: string; toUnitId: string; agreementId: string; effectiveDate: string }) {
    return this.operations.createTransfer(body.fromUnitId, body.toUnitId, body.agreementId, new Date(body.effectiveDate));
  }
}
