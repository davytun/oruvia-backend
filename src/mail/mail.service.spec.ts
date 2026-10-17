import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../config/env.validation.js';
import { MailService } from './mail.service.js';

vi.mock('nodemailer');

describe('MailService', () => {
  let mockTransporter: {
    verify: ReturnType<typeof vi.fn>;
    sendMail: ReturnType<typeof vi.fn>;
  };

  const createMockConfig = (overrides: Partial<Env> = {}) => {
    const configMap: Record<string, unknown> = {
      NODE_ENV: 'test',
      EMAIL_PROVIDER: 'smtp',
      EMAIL_FROM: 'noreply@oruvia.com',
      SMTP_HOST: 'smtp.mailgun.org',
      SMTP_PORT: 587,
      SMTP_SECURE: false,
      SMTP_USER: 'postmaster@oruvia.com',
      SMTP_PASS: 'topsecret-smtp-password',
      ...overrides,
    };

    return {
      get: vi.fn((key: string) => configMap[key]),
    } as unknown as ConfigService<Env, true>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransporter = {
      verify: vi.fn().mockResolvedValue(true),
      sendMail: vi.fn().mockResolvedValue({ messageId: 'msg-123' }),
    };

    vi.mocked(nodemailer.createTransport).mockReturnValue(
      mockTransporter as unknown as Transporter,
    );
  });

  describe('Initialization & Transporter Reuse', () => {
    it('creates and reuses SMTP transporter when EMAIL_PROVIDER is smtp', () => {
      const config = createMockConfig();
      new MailService(config);

      expect(nodemailer.createTransport).toHaveBeenCalledTimes(1);
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.mailgun.org',
        port: 587,
        secure: false,
        auth: {
          user: 'postmaster@oruvia.com',
          pass: 'topsecret-smtp-password',
        },
      });
    });

    it('does not create SMTP transporter when EMAIL_PROVIDER is console', () => {
      const config = createMockConfig({ EMAIL_PROVIDER: 'console' });
      new MailService(config);

      expect(nodemailer.createTransport).not.toHaveBeenCalled();
    });

    it('throws when EMAIL_PROVIDER is not recognized', () => {
      const config = createMockConfig({
        EMAIL_PROVIDER: 'sendgrid' as unknown as 'console',
      });
      expect(() => new MailService(config)).toThrow(
        /Unsupported email provider "sendgrid"/,
      );
    });
  });

  describe('Startup Verification (onModuleInit)', () => {
    it('verifies SMTP connection on startup when provider is smtp', async () => {
      const config = createMockConfig();
      const service = new MailService(config);

      await expect(service.onModuleInit()).resolves.toBeUndefined();
      expect(mockTransporter.verify).toHaveBeenCalledTimes(1);
    });

    it('fails clearly on startup if SMTP connection cannot be established', async () => {
      mockTransporter.verify.mockRejectedValue(
        new Error('ECONNREFUSED 127.0.0.1:587'),
      );
      const config = createMockConfig();
      const service = new MailService(config);

      await expect(service.onModuleInit()).rejects.toThrow(
        /Failed to establish SMTP connection on startup: ECONNREFUSED 127.0.0.1:587/,
      );
    });

    it('does not attempt verification when provider is console', async () => {
      const config = createMockConfig({ EMAIL_PROVIDER: 'console' });
      const service = new MailService(config);

      await expect(service.onModuleInit()).resolves.toBeUndefined();
      expect(mockTransporter.verify).not.toHaveBeenCalled();
    });
  });

  describe('Template Content & Verification Code Delivery', () => {
    it('sends verification code email with 15-minute expiry, instructions, HTML, and text', async () => {
      const config = createMockConfig();
      const service = new MailService(config);

      await service.sendVerificationCode('seeker@example.com', '654321');

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
      const sentPayload = mockTransporter.sendMail.mock.calls[0][0];

      expect(sentPayload.from).toBe('noreply@oruvia.com');
      expect(sentPayload.to).toBe('seeker@example.com');
      expect(sentPayload.subject).toBe('Verify your Oruvia seeker account');

      // Plaintext checks
      expect(sentPayload.text).toContain('654321');
      expect(sentPayload.text).toContain('15 minutes');
      expect(sentPayload.text).toContain('verify your email address');

      // HTML checks
      expect(sentPayload.html).toContain('654321');
      expect(sentPayload.html).toContain('15 minutes');
      expect(sentPayload.html).toContain('Oruvia');

      // Recorded in sentMessages
      expect(service.sentMessages).toHaveLength(1);
      expect(service.sentMessages[0].to).toBe('seeker@example.com');
    });

    it('sends password reset code email with 15-minute expiry, instructions, HTML, and text', async () => {
      const config = createMockConfig();
      const service = new MailService(config);

      await service.sendPasswordResetCode('seeker@example.com', '987654');

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
      const sentPayload = mockTransporter.sendMail.mock.calls[0][0];

      expect(sentPayload.from).toBe('noreply@oruvia.com');
      expect(sentPayload.to).toBe('seeker@example.com');
      expect(sentPayload.subject).toBe('Reset your Oruvia seeker password');

      // Plaintext checks
      expect(sentPayload.text).toContain('987654');
      expect(sentPayload.text).toContain('15 minutes');
      expect(sentPayload.text).toContain('reset your password');

      // HTML checks
      expect(sentPayload.html).toContain('987654');
      expect(sentPayload.html).toContain('15 minutes');
      expect(sentPayload.html).toContain('Reset your password');

      // Recorded in sentMessages
      expect(service.sentMessages).toHaveLength(1);
      expect(service.sentMessages[0].to).toBe('seeker@example.com');
    });
  });

  describe('Delivery Error Handling & Security', () => {
    it('does not record email as sent when SMTP delivery fails', async () => {
      mockTransporter.sendMail.mockRejectedValue(
        new Error('550 User unknown'),
      );

      const config = createMockConfig();
      const service = new MailService(config);

      await expect(
        service.sendVerificationCode('unknown@example.com', '123456'),
      ).rejects.toThrow(/Email delivery failed: 550 User unknown/);

      // Must NOT be marked as sent
      expect(service.sentMessages).toHaveLength(0);
    });

    it('supports console provider without external SMTP transport', async () => {
      const config = createMockConfig({ EMAIL_PROVIDER: 'console' });
      const service = new MailService(config);

      await service.sendVerificationCode('console-test@example.com', '112233');

      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
      expect(service.sentMessages).toHaveLength(1);
      expect(service.sentMessages[0].to).toBe('console-test@example.com');
      expect(service.sentMessages[0].text).toContain('112233');
    });
  });
});
