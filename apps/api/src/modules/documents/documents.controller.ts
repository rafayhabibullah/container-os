import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { DocumentsService } from './documents.service';
import { PrismaClient } from '@prisma/client';

@ApiTags('operator', 'tenant')
@ApiBearerAuth()
@Controller()
export class DocumentsController {
  constructor(private documents: DocumentsService, private readonly prisma: PrismaClient) {}

  @Post('operator/v1/documents/upload')
  @UseGuards(JwtAuthGuard)
  initiateUpload(@Body() body: { customerId: string; kind: string; fileName: string; locale?: string }) {
    return this.documents.initiateUpload(body.customerId, body.kind, body.fileName, body.locale);
  }

  @Post('operator/v1/signatures/send')
  @UseGuards(JwtAuthGuard)
  createEnvelope(@Body() body: { documentId: string }) { return this.documents.createSignatureEnvelope(body.documentId); }

  @Post('tenant/v1/signatures/:envelopeId/complete')
  @UseGuards(JwtAuthGuard)
  completeSignature(@Param('envelopeId') envelopeId: string, @CurrentUser() user: AuthenticatedUser) { return this.documents.completeSignature(envelopeId, user.id); }

  @Get('tenant/v1/documents')
  @UseGuards(JwtAuthGuard)
  getDocuments(@CurrentUser() user: AuthenticatedUser) { return this.documents.getTenantDocuments(user.id); }

  @Get('v1/organisations/:organisationId/documents')
  @UseGuards(JwtAuthGuard, OrganisationGuard)
  @ApiOperation({ summary: 'List documents for all sites in organisation' })
  async listOrgDocuments(@Param('organisationId') orgId: string) {
    const sites = await this.prisma.site.findMany({ where: { organisationId: orgId }, select: { id: true } });
    const siteIds = sites.map((s) => s.id);
    const agreements = await this.prisma.agreement.findMany({ where: { siteId: { in: siteIds } }, select: { id: true } });
    const agreementIds = agreements.map((a) => a.id);
    return this.prisma.document.findMany({
      where: {
        OR: [
          { subjectType: 'agreement', subjectId: { in: agreementIds } },
          { subjectType: 'site', subjectId: { in: siteIds } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
