import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ListingsService } from './listings.service';
import { ListingsController } from './listings.controller';
import { StorageService } from '../documents/storage.service';

@Module({
  controllers: [ListingsController],
  providers: [ListingsService, StorageService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [ListingsService],
})
export class ListingsModule {}
