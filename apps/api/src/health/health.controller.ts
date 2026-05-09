import { Controller, Get } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

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
    return '# HELP container_os_up Application is up\n# TYPE container_os_up gauge\ncontainer_os_up 1\n';
  }
}
