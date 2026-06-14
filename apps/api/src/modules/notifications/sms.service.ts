import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  // Seam for future Twilio integration
  async send(params: { to: string; body: string }): Promise<{ messageId: string }> {
    this.logger.log(`[stub] SMS to ${params.to}: ${params.body}`);
    return { messageId: `sms_stub_${Date.now()}` };
  }
}
