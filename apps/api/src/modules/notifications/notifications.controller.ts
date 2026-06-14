import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Controller, Get, Post, Patch, Body, UseGuards } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService, NotificationChannel } from './notifications.service';

@ApiTags('operator', 'tenant')
@Controller()
export class NotificationsController {
  constructor(private notifications: NotificationsService, private prisma: PrismaClient) {}

  @Post('operator/v1/notifications/test')
  @UseGuards(JwtAuthGuard)
  testNotification(@Body() body: { recipientId: string; eventType: string; locale: string }) {
    return this.notifications.sendNotification({ ...body, channel: 'email', vars: {} });
  }

  // Agreement.tenantId is Customer.id, but the JWT sub is User.id, so resolve via Contact.email.
  private async resolveCustomerIds(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
    const contacts = await this.prisma.contact.findMany({ where: { email: user.email, deletedAt: null }, select: { customerId: true } });
    return [...new Set(contacts.map((c) => c.customerId))];
  }

  @Get('tenant/v1/notification-preferences')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getPreferences(@CurrentUser() user: AuthenticatedUser) {
    const [customerId] = await this.resolveCustomerIds(user.id);
    return this.notifications.listPreferences(customerId ?? user.id);
  }

  @Patch('tenant/v1/notification-preferences')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async updatePreference(@CurrentUser() user: AuthenticatedUser, @Body() body: { eventType: string; channel: NotificationChannel; enabled: boolean }) {
    const [customerId] = await this.resolveCustomerIds(user.id);
    await this.notifications.upsertPreference(customerId ?? user.id, body.eventType, body.channel, body.enabled);
    return { updated: true };
  }
}
