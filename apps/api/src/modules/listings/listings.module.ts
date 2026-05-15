import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ListingsService } from './listings.service';
import { ListingsController } from './listings.controller';

@Module({
  controllers: [ListingsController],
  providers: [ListingsService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [ListingsService],
})
export class ListingsModule {}
