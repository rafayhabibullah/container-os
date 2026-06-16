import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { JobsModule } from '../jobs/jobs.module';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { PlatformTokenGuard } from './platform-token.guard';

@Module({
  imports: [JobsModule],
  controllers: [PlatformController],
  providers: [PlatformService, PlatformTokenGuard, { provide: PrismaClient, useValue: new PrismaClient() }],
})
export class PlatformModule {}
