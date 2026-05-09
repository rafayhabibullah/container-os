import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async inviteUser(email: string, type: string, roleId: string, siteIds: string[]) {
    const user = await this.prisma.user.create({
      data: { email, type: type as 'owner' | 'operator' | 'tenant', status: 'invited' },
    });
    await this.prisma.permissionAssignment.create({
      data: { userId: user.id, roleId, siteIds },
    });
    return user;
  }

  async getMe(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { assignments: { include: { role: true } } },
    });
  }
}
