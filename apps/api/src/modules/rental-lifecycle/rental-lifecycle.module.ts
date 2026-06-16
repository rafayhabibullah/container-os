import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AccessControlModule } from '../access-control/access-control.module';
import { AgreementsModule } from '../agreements/agreements.module';
import { OperationsModule } from '../operations/operations.module';
import { RentalLifecycleController } from './rental-lifecycle.controller';
import { RentalLifecycleService } from './rental-lifecycle.service';

@Module({
  imports: [AgreementsModule, AccessControlModule, OperationsModule],
  controllers: [RentalLifecycleController],
  providers: [RentalLifecycleService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [RentalLifecycleService],
})
export class RentalLifecycleModule {}
