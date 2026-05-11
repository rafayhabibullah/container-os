import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { PrismaClient } from '@prisma/client';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RbacService } from './rbac.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SiteGuard } from '../../common/guards/site.guard';

@Module({
  imports: [PassportModule],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    RbacService,
    SiteGuard,
    AuthService,
    { provide: PrismaClient, useValue: new PrismaClient() },
  ],
  exports: [RbacService, SiteGuard, PrismaClient],
})
export class AuthModule {}
