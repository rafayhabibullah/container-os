import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { CurrentMember } from '../../common/decorators/current-member.decorator';
import { OperationsService } from './operations.service';
import { InspectionService } from './inspection.service';
import { PrismaClient } from '@prisma/client';

interface MemberContext { userId: string; role: string; organisationId: string; }

@ApiTags('operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganisationGuard)
@Controller('v1/organisations/:organisationId')
export class OrgOperationsController {
  constructor(
    private readonly ops: OperationsService,
    private readonly inspections: InspectionService,
    private readonly prisma: PrismaClient,
  ) {}

  @Get('tasks')
  @ApiOperation({ summary: 'List tasks' })
  listTasks(
    @Param('organisationId') orgId: string,
    @Query('siteId') siteId?: string,
    @Query('status') status?: string,
  ) {
    return this.ops.listTasks(orgId, { siteId, status });
  }

  @Post('tasks')
  @ApiOperation({ summary: 'Create a task' })
  createTask(
    @Param('organisationId') orgId: string,
    @Body() body: { siteId: string; title: string; notes?: string; assigneeId?: string; dueAt?: string },
  ) {
    return this.ops.createTask({ siteId: body.siteId, title: body.title, assigneeId: body.assigneeId, dueAt: body.dueAt ? new Date(body.dueAt) : undefined });
  }

  @Patch('tasks/:taskId')
  @ApiOperation({ summary: 'Update task status or assignee' })
  updateTask(
    @Param('organisationId') orgId: string,
    @Param('taskId') taskId: string,
    @Body() body: { status?: string; notes?: string; assigneeId?: string },
  ) {
    return this.ops.updateTask(orgId, taskId, body);
  }

  @Get('incidents')
  @ApiOperation({ summary: 'List incidents' })
  listIncidents(
    @Param('organisationId') orgId: string,
    @Query('siteId') siteId?: string,
    @Query('status') status?: string,
  ) {
    return this.ops.listIncidents(orgId, { siteId, status });
  }

  @Post('incidents')
  @ApiOperation({ summary: 'Report an incident' })
  createIncident(
    @Param('organisationId') orgId: string,
    @Body() body: { siteId: string; unitId?: string; title: string; description: string; severity: string },
    @CurrentMember() member: MemberContext,
  ) {
    return this.ops.createIncident({ siteId: body.siteId, severity: body.severity, type: body.title });
  }

  @Patch('incidents/:incidentId')
  @ApiOperation({ summary: 'Update incident status' })
  updateIncident(
    @Param('organisationId') orgId: string,
    @Param('incidentId') incidentId: string,
    @Body() body: { status?: string },
  ) {
    return this.ops.updateIncident(orgId, incidentId, body);
  }

  @Get('maintenance-orders')
  @ApiOperation({ summary: 'List maintenance orders' })
  listMaintenanceOrders(
    @Param('organisationId') orgId: string,
    @Query('siteId') siteId?: string,
  ) {
    return this.ops.listMaintenanceOrders(orgId, { siteId });
  }

  @Post('maintenance-orders')
  @ApiOperation({ summary: 'Create a maintenance order' })
  createMaintenanceOrder(
    @Param('organisationId') orgId: string,
    @Body() body: { unitId: string; vendorContact?: string },
  ) {
    return this.ops.createMaintenanceOrder(orgId, body);
  }

  @Post('inspection-runs')
  @ApiOperation({ summary: 'Start an inspection run' })
  createInspectionRun(
    @Body() body: { unitId: string; siteId: string; kind: string; checklist: { code: string; result: string; note?: string }[] },
  ) {
    return this.inspections.createInspectionRun(body.unitId, body.siteId, body.kind, body.checklist as any);
  }

  @Get('inspections')
  @ApiOperation({ summary: 'List inspection runs for all units in organisation' })
  async listInspections(@Param('organisationId') orgId: string) {
    const sites = await this.prisma.site.findMany({ where: { organisationId: orgId }, select: { id: true } });
    const siteIds = sites.map((s) => s.id);
    const units = await this.prisma.unit.findMany({ where: { siteId: { in: siteIds } }, select: { id: true } });
    const unitIds = units.map((u) => u.id);
    return this.prisma.inspectionRun.findMany({
      where: { unitId: { in: unitIds } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
