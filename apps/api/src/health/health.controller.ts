import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaClient } from '@prisma/client';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private prisma: PrismaClient) {}

  @Get('healthz')
  liveness() {
    return {
      status: 'ok',
      version: process.env.npm_package_version ?? '0.1.0',
    };
  }

  @Get('readyz')
  async readiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'ok' };
    } catch {
      return { status: 'degraded', db: 'unreachable' };
    }
  }

  @Get('metrics')
  metrics() {
    return '# HELP sitelager_up Application is up\n# TYPE sitelager_up gauge\nsitelager_up 1\n';
  }
}
