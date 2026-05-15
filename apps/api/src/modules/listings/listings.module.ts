import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ListingsService } from './listings.service';

@Module({
  providers: [ListingsService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [ListingsService],
})
export class ListingsModule {}
