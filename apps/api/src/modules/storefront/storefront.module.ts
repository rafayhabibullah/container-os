import { Module } from '@nestjs/common';
import { StorefrontService } from './storefront.service';
import { StorefrontController } from './storefront.controller';
import { PrismaClient } from '@prisma/client';

@Module({
  controllers: [StorefrontController],
  providers: [StorefrontService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [StorefrontService],
})
export class StorefrontModule {}
