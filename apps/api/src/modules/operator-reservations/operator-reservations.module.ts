import { Module } from '@nestjs/common';
import { OperatorReservationsService } from './operator-reservations.service';
import { OperatorReservationsController } from './operator-reservations.controller';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [OperatorReservationsController],
  providers: [OperatorReservationsService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [OperatorReservationsService],
})
export class OperatorReservationsModule {}
