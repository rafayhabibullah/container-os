import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { SystemTokenGuard } from './system-token.guard';

@UseGuards(SystemTokenGuard)
@Controller('system/v1/jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Post()
  enqueue(@Body() body: { kind: string; payload?: object; runAt?: string; maxAttempts?: number }) {
    return this.jobs.enqueue(body.kind, body.payload ?? {}, { runAt: body.runAt ? new Date(body.runAt) : undefined, maxAttempts: body.maxAttempts });
  }

  @Post('claim')
  claim(@Body() body: { kinds?: string[] }) {
    return this.jobs.claimNext(body.kinds);
  }

  @Post('process-next')
  processNext(@Body() body: { kinds?: string[] }) {
    return this.jobs.processNext(body.kinds);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string) {
    return this.jobs.complete(id);
  }

  @Post(':id/fail')
  fail(@Param('id') id: string, @Body() body: { error: string; retryDelayMs?: number }) {
    return this.jobs.fail(id, body.error, body.retryDelayMs);
  }
}
