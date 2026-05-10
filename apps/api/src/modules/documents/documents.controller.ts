import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { DocumentsService } from './documents.service';

@Controller()
export class DocumentsController {
  constructor(private documents: DocumentsService) {}

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
}
