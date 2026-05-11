import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { AuthService } from './auth.service';
import { AuthController, OrganisationInviteController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { OrganisationGuard } from '../../common/guards/organisation.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  providers: [
    { provide: PrismaClient, useValue: new PrismaClient() },
    AuthService,
    JwtStrategy,
    OrganisationGuard,
  ],
  controllers: [AuthController, OrganisationInviteController],
  exports: [AuthService, OrganisationGuard],
})
export class AuthModule {}
