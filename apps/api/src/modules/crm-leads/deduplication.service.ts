import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class DeduplicationService {
  constructor(private prisma: PrismaClient) {}

  async findDuplicate(email: string, phone?: string): Promise<{ customerId: string } | null> {
    const byEmail = await this.prisma.contact.findFirst({ where: { email } });
    if (byEmail) return { customerId: byEmail.customerId };
    if (phone) {
      const byPhone = await this.prisma.contact.findFirst({ where: { phone } });
      if (byPhone) return { customerId: byPhone.customerId };
    }
    return null;
  }
}
