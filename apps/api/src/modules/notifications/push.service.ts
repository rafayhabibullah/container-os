import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  // Seam for future FCM integration
  async send(params: { to: string; title: string; body: string }): Promise<{ messageId: string }> {
    this.logger.log(`[stub] Push to ${params.to}: ${params.title} - ${params.body}`);
    return { messageId: `push_stub_${Date.now()}` };
  }
}
