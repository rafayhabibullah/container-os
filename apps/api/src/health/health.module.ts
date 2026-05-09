import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaClient } from '@prisma/client';

@Module({
  controllers: [HealthController],
  providers: [{ provide: PrismaClient, useValue: new PrismaClient() }],
})
export class HealthModule {}
