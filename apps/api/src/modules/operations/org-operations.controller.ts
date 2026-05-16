import { BadRequestException, Body, Controller, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { CurrentMember } from '../../common/decorators/current-member.decorator';
import { OperationsService } from './operations.service';
import { InspectionService } from './inspection.service';
import { PrismaClient, TaskType, TaskPriority } from '@prisma/client';
import { StorageService } from '../documents/storage.service';

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
    private readonly storage: StorageService,
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
    @Body() body: { siteId: string; title: string; type?: string; priority?: string; notes?: string; assigneeId?: string; unitId?: string; tenantId?: string; bookingId?: string; dueAt?: string },
  ) {
    return this.ops.createTask({
      organisationId: orgId,
      siteId: body.siteId,
      title: body.title,
      type: body.type as TaskType | undefined,
      priority: body.priority as TaskPriority | undefined,
      notes: body.notes,
      assigneeId: body.assigneeId,
      unitId: body.unitId,
      tenantId: body.tenantId,
      bookingId: body.bookingId,
      dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
    });
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
    @Body() body: {
      unitId: string;
      siteId: string;
      kind: string;
      checklist: { code: string; label: string; result: string; note?: string }[];
      photoIds?: string[];
      notes?: string;
      contractId?: string;
      depositDeduction?: number;
    },
  ) {
    return this.inspections.createInspectionRun({
      unitId: body.unitId,
      siteId: body.siteId,
      kind: body.kind,
      checklist: body.checklist as any,
      photoIds: body.photoIds,
      notes: body.notes,
      contractId: body.contractId,
      depositDeduction: body.depositDeduction,
    });
  }

  @Patch('inspection-runs/:id')
  @ApiOperation({ summary: 'Complete an in-progress inspection run' })
  async completeInspectionRun(
    @Param('organisationId') orgId: string,
    @Param('id') id: string,
    @Body() body: {
      checklist: { code: string; label: string; result: string; note?: string }[];
      notes?: string;
      photoIds?: string[];
      depositDeduction?: number;
    },
  ) {
    if (!Array.isArray(body.checklist) || body.checklist.length === 0) {
      throw new BadRequestException('checklist must be a non-empty array');
    }
    const validResults = new Set(['pass', 'fail', 'na']);
    if (body.checklist.some((item) => !validResults.has(item.result) || !item.code || !item.label)) {
      throw new BadRequestException('Each checklist item must have code, label, and result of pass, fail, or na');
    }

    const run = await this.prisma.inspectionRun.findFirst({ where: { id } });
    if (!run) throw new NotFoundException(`Inspection ${id} not found`);
    if (run.completedAt) throw new BadRequestException(`Inspection ${id} is already completed`);

    const unit = await this.prisma.unit.findFirst({ where: { id: run.unitId }, select: { siteId: true } });
    if (!unit) throw new NotFoundException(`Unit for inspection ${id} not found`);

    const site = await this.prisma.site.findFirst({ where: { id: unit.siteId, organisationId: orgId } });
    if (!site) throw new ForbiddenException('Inspection does not belong to this organisation');

    return this.inspections.completeInspectionRun(id, {
      checklist: body.checklist as any,
      notes: body.notes,
      photoIds: body.photoIds,
      depositDeduction: body.depositDeduction,
    });
  }

  @Post('inspection-photos')
  @ApiOperation({ summary: 'Upload an inspection photo and return a storage key' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadInspectionPhoto(
    @Param('organisationId') orgId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const key = `inspections/${orgId}/${Date.now()}-${file.originalname}`;
    const { storageKey } = await this.storage.upload(key, file.buffer, file.mimetype);
    return { photoId: storageKey };
  }

  @Get('inspections')
  @ApiOperation({ summary: 'List inspection runs for all units in organisation' })
  async listInspections(@Param('organisationId') orgId: string) {
    const sites = await this.prisma.site.findMany({ where: { organisationId: orgId }, select: { id: true, name: true } });
    const siteIds = sites.map((s) => s.id);
    const siteMap = new Map(sites.map((s) => [s.id, s.name]));
    const units = await this.prisma.unit.findMany({ where: { siteId: { in: siteIds } }, select: { id: true, siteId: true, unitCode: true } });
    const unitMap = new Map(units.map((u) => [u.id, { siteId: u.siteId, unitCode: u.unitCode }]));
    const runs = await this.prisma.inspectionRun.findMany({
      where: { unitId: { in: [...unitMap.keys()] } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return runs.map((r) => {
      const unit = unitMap.get(r.unitId);
      const siteId = unit?.siteId ?? null;
      return { ...r, siteId, siteName: siteId ? (siteMap.get(siteId) ?? null) : null, unitCode: unit?.unitCode ?? null };
    });
  }
}
