import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreatePriceBookDto } from './dto/create-price-book.dto';
import { CreateRateRuleDto } from './dto/create-rate-rule.dto';

@Injectable()
export class PricingManagementService {
  constructor(private readonly prisma: PrismaClient) {}

  async listPriceBooks(siteId: string) {
    return this.prisma.priceBook.findMany({
      where: { siteId },
      include: { rules: true },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async createPriceBook(siteId: string, dto: CreatePriceBookDto, memberRole: string) {
    if (memberRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');
    return this.prisma.priceBook.create({
      data: { siteId, name: dto.name, effectiveFrom: new Date(dto.effectiveFrom), status: 'draft' },
    });
  }

  private async findPriceBook(siteId: string, priceBookId: string) {
    const book = await this.prisma.priceBook.findFirst({ where: { id: priceBookId, siteId } });
    if (!book) throw new NotFoundException('PRICE_BOOK_NOT_FOUND');
    return book;
  }

  async publishPriceBook(siteId: string, priceBookId: string, memberRole: string) {
    if (memberRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');
    await this.findPriceBook(siteId, priceBookId);
    return this.prisma.priceBook.update({ where: { id: priceBookId }, data: { status: 'published' } });
  }

  async archivePriceBook(siteId: string, priceBookId: string, memberRole: string) {
    if (memberRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');
    await this.findPriceBook(siteId, priceBookId);
    return this.prisma.priceBook.update({ where: { id: priceBookId }, data: { status: 'archived' } });
  }

  async addRateRule(siteId: string, priceBookId: string, dto: CreateRateRuleDto, memberRole: string) {
    if (memberRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');
    await this.findPriceBook(siteId, priceBookId);
    return this.prisma.rateRule.create({
      data: {
        priceBookId,
        unitTypeId: dto.unitTypeId,
        amountMinor: dto.amountMinor,
        billingCycle: dto.billingCycle,
        conditions: dto.conditions ?? undefined,
      },
    });
  }

  async removeRateRule(siteId: string, _priceBookId: string, rateRuleId: string, memberRole: string) {
    if (memberRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');
    const rule = await this.prisma.rateRule.findFirst({
      where: { id: rateRuleId },
      include: { priceBook: true },
    });
    if (!rule || (rule.priceBook as any).siteId !== siteId) throw new NotFoundException('RATE_RULE_NOT_FOUND');
    await this.prisma.rateRule.delete({ where: { id: rateRuleId } });
  }
}
