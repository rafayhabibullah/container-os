import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Controller, ForbiddenException, Post, Get, Param, Body, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

  @Post('operator/v1/documents/:documentId/complete-upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  completeUpload(
    @Param('documentId') documentId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.completeUpload(documentId, file.buffer, file.mimetype, user.id);
  }

  @Post('operator/v1/documents/:documentId/versions')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  createVersion(
    @Param('documentId') documentId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.createVersion({ previousDocumentId: documentId, buffer: file.buffer, contentType: file.mimetype, fileName: file.originalname, actorId: user.id });
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

  @Get('tenant/v1/documents/:documentId/download')
  @UseGuards(JwtAuthGuard)
  async downloadDocument(@Param('documentId') documentId: string, @CurrentUser() user: AuthenticatedUser) {
    const doc = await this.prisma.document.findUniqueOrThrow({ where: { id: documentId } });
    if (doc.subjectType === 'Customer') {
      const contact = await this.prisma.contact.findFirst({ where: { customerId: doc.subjectId, email: user.email, deletedAt: null }, select: { id: true } });
      if (!contact) throw new ForbiddenException('Document does not belong to this tenant');
    } else if (doc.subjectType === 'Agreement') {
      const contact = await this.prisma.contact.findFirst({ where: { email: user.email, deletedAt: null }, select: { customerId: true } });
      const agreement = contact
        ? await this.prisma.agreement.findFirst({ where: { id: doc.subjectId, tenantId: contact.customerId }, select: { id: true } })
        : null;
      if (!agreement) throw new ForbiddenException('Document does not belong to this tenant');
    } else {
      throw new ForbiddenException('Document is not tenant-visible');
    }
    await this.documents.logAccess(documentId, user.id, 'download');
    const downloadUrl = await this.documents.getDownloadUrl(doc.storageKey);
    return { downloadUrl };
  }

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
          { subjectType: 'Agreement', subjectId: { in: agreementIds } },
          { subjectType: 'Site', subjectId: { in: siteIds } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
