import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { Env } from '../config/env.validation.js';
import type { EmailMessage, EmailSender } from './mail.interface.js';
import {
  buildKycDecisionEmail,
  buildPasswordResetEmail,
  buildVerificationEmail,
} from './mail.templates.js';

@Injectable()
export class MailService implements EmailSender, OnModuleInit {
  private readonly logger = new Logger('MailService');
  private readonly provider: string;
  private readonly fromAddress: string;
  private readonly transporter?: Transporter;

  /** Stored for test inspection and debugging when running without a real email provider. */
  public readonly sentMessages: EmailMessage[] = [];

  constructor(private readonly config: ConfigService<Env, true>) {
    this.provider =
      this.config.get<string>('EMAIL_PROVIDER', { infer: true }) ?? 'console';
    this.fromAddress =
      this.config.get<string>('EMAIL_FROM', { infer: true }) ??
      'noreply@oruvia.com';

    if (this.provider === 'smtp') {
      const host = this.config.get<string>('SMTP_HOST', { infer: true });
      const port = this.config.get<number>('SMTP_PORT', { infer: true });
      const secure = this.config.get<boolean>('SMTP_SECURE', { infer: true });
      const user = this.config.get<string>('SMTP_USER', { infer: true });
      const pass = this.config.get<string>('SMTP_PASS', { infer: true });

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });
    } else if (this.provider !== 'console') {
      throw new Error(
        `Unsupported email provider "${this.provider}". Only "console" and "smtp" providers are supported.`,
      );
    }
  }

  async onModuleInit(): Promise<void> {
    if (this.provider === 'smtp' && this.transporter) {
      try {
        await this.transporter.verify();
        this.logger.log('SMTP connection verified successfully.');
      } catch (error: unknown) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown connection error';
        this.logger.error(
          `Failed to establish SMTP connection on startup: ${errorMsg}`,
        );
        throw new Error(
          `Failed to establish SMTP connection on startup: ${errorMsg}`,
        );
      }
    }
  }

  async sendEmail(message: EmailMessage): Promise<void> {
    if (this.provider === 'console') {
      this.sentMessages.push(message);

      const nodeEnv = this.config.get<string>('NODE_ENV', { infer: true });
      // Only log simulated delivery in non-production environments. Never log verification codes.
      if (nodeEnv !== 'production') {
        this.logger.log(
          `[Email -> ${message.to}] Subject: "${message.subject}" | Delivery simulated (EMAIL_PROVIDER=console). No external email network provider configured.`,
        );
      }
      return;
    }

    if (this.provider === 'smtp') {
      if (!this.transporter) {
        throw new Error('SMTP transporter is not initialized.');
      }

      try {
        await this.transporter.sendMail({
          from: this.fromAddress,
          to: message.to,
          subject: message.subject,
          text: message.text,
          html: message.html,
        });

        // Only record as sent upon successful dispatch
        this.sentMessages.push(message);

        const nodeEnv = this.config.get<string>('NODE_ENV', { infer: true });
        if (nodeEnv !== 'production') {
          this.logger.log(
            `[Email -> ${message.to}] Subject: "${message.subject}" | Dispatched via SMTP.`,
          );
        }
      } catch (error: unknown) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown SMTP delivery error';
        // Never log message body or credentials
        this.logger.error(
          `Failed to deliver email to ${message.to}: ${errorMsg}`,
        );
        throw new Error(`Email delivery failed: ${errorMsg}`);
      }
      return;
    }

    throw new Error(`Unsupported email provider "${this.provider}".`);
  }

  async sendVerificationCode(
    email: string,
    code: string,
    accountType: 'seeker' | 'landlord' | 'agent' = 'seeker',
  ): Promise<void> {
    const { subject, text, html } = await buildVerificationEmail(
      code,
      accountType,
    );
    await this.sendEmail({
      to: email,
      subject,
      text,
      html,
    });
  }

  async sendPasswordResetCode(
    email: string,
    code: string,
    accountType: 'seeker' | 'landlord' | 'agent' | 'admin' = 'seeker',
  ): Promise<void> {
    const { subject, text, html } = await buildPasswordResetEmail(
      code,
      accountType,
    );
    await this.sendEmail({
      to: email,
      subject,
      text,
      html,
    });
  }

  async sendKycDecision(
    email: string,
    fullName: string,
    approved: boolean,
    accountType: 'landlord' | 'agent',
    rejectionReason?: string,
  ): Promise<void> {
    const { subject, text, html } = await buildKycDecisionEmail(
      fullName,
      approved,
      accountType,
      rejectionReason,
    );
    await this.sendEmail({
      to: email,
      subject,
      text,
      html,
    });
  }
}
