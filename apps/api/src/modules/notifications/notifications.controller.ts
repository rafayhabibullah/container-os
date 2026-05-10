import { Controller, Post, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { NotificationsService } from './notifications.service';

@Controller()
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Post('operator/v1/notifications/test')
  @UseGuards(JwtAuthGuard)
  testNotification(@Body() body: { recipientId: string; eventType: string; locale: string }) {
    return this.notifications.sendNotification({ ...body, channel: 'email', vars: {} });
  }

  @Patch('tenant/v1/notification-preferences')
  @UseGuards(JwtAuthGuard)
  updatePreference() { return { updated: true }; }
}
