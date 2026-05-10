import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST ?? 'localhost', port: parseInt(process.env.SMTP_PORT ?? '1025'), secure: false, ignoreTLS: true });
  }

  async send(params: { to: string; subject: string; html: string; from?: string }): Promise<{ messageId: string }> {
    const info = await this.transporter.sendMail({ from: params.from ?? 'noreply@container-os.de', to: params.to, subject: params.subject, html: params.html });
    return { messageId: info.messageId };
  }
}
