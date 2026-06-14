import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { TemplateRendererService } from './template-renderer.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { PushService } from './push.service';
import { NotificationsController } from './notifications.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, TemplateRendererService, EmailService, SmsService, PushService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [NotificationsService],
})
export class NotificationsModule {}
