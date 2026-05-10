import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { AuditModule } from '../audit/audit.module';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [AuditModule],
  controllers: [ReservationsController],
  providers: [ReservationsService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [ReservationsService],
})
export class ReservationsModule {}
