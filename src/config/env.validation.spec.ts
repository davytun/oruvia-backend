import { validateEnv } from './env.validation.js';

const required = {
  DB_USERNAME: 'user',
  DB_PASSWORD: 'secret',
  DB_NAME: 'oruvia',
};

describe('validateEnv', () => {
  it('applies defaults for optional variables', () => {
    const env = validateEnv(required);

    expect(env).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      LOG_LEVEL: 'info',
      CORS_ORIGINS: '',
      DB_HOST: 'localhost',
      DB_PORT: 5432,
      DB_SSL: false,
      DB_LOGGING: false,
      JWT_EXPIRES_IN: '1d',
      EMAIL_PROVIDER: 'console',
      EMAIL_FROM: 'noreply@oruvia.com',
    });
  });

  it('accepts valid custom LOG_LEVEL values', () => {
    const env = validateEnv({ ...required, LOG_LEVEL: 'debug' });
    expect(env.LOG_LEVEL).toBe('debug');
  });

  it('rejects invalid LOG_LEVEL values', () => {
    expect(() =>
      validateEnv({ ...required, LOG_LEVEL: 'verbose_invalid' }),
    ).toThrow(/LOG_LEVEL/);
  });

  it('coerces numeric and boolean strings', () => {
    const env = validateEnv({
      ...required,
      PORT: '4000',
      DB_PORT: '6543',
      DB_SSL: 'true',
    });

    expect(env.PORT).toBe(4000);
    expect(env.DB_PORT).toBe(6543);
    expect(env.DB_SSL).toBe(true);
  });

  it('rejects missing required variables without leaking values', () => {
    expect(() => validateEnv({ DB_PASSWORD: 'secret' })).toThrow(
      /DB_USERNAME.*DB_NAME/,
    );
    expect(() => validateEnv({ DB_PASSWORD: 'secret' })).not.toThrow(/secret/);
  });

  it('rejects invalid values', () => {
    expect(() => validateEnv({ ...required, NODE_ENV: 'staging' })).toThrow(
      /NODE_ENV/,
    );
    expect(() => validateEnv({ ...required, PORT: '99999' })).toThrow(/PORT/);
  });

  describe('JWT_SECRET security rules', () => {
    it('requires JWT_SECRET in production and rejects default dev secret', () => {
      expect(() =>
        validateEnv({
          ...required,
          NODE_ENV: 'production',
        }),
      ).toThrow(/JWT_SECRET/);

      expect(() =>
        validateEnv({
          ...required,
          NODE_ENV: 'production',
          JWT_SECRET: 'super-secret-seeker-jwt-key-for-dev-32chars',
        }),
      ).toThrow(/JWT_SECRET/);
    });

    it('rejects secrets shorter than 32 characters', () => {
      expect(() =>
        validateEnv({
          ...required,
          JWT_SECRET: 'short-secret-under-32-chars',
        }),
      ).toThrow(/JWT_SECRET/);
    });

    it('accepts strong random secrets in production', () => {
      const env = validateEnv({
        ...required,
        NODE_ENV: 'production',
        JWT_SECRET: 'a-very-strong-production-secret-with-at-least-32-chars!',
        // Production also requires cloudinary KYC storage (see rules below)
        KYC_STORAGE_PROVIDER: 'cloudinary',
        CLOUDINARY_CLOUD_NAME: 'demo-cloud',
        CLOUDINARY_API_KEY: '1234567890',
        CLOUDINARY_API_SECRET: 'secret-value',
      });
      expect(env.JWT_SECRET).toBe(
        'a-very-strong-production-secret-with-at-least-32-chars!',
      );
    });
  });

  describe('EMAIL_PROVIDER=smtp configuration rules', () => {
    const validSmtp = {
      ...required,
      EMAIL_PROVIDER: 'smtp',
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '465',
      SMTP_SECURE: 'true',
      SMTP_USER: 'smtp_user@example.com',
      SMTP_PASS: 'smtp_secret_pass',
      EMAIL_FROM: 'noreply@example.com',
    };

    it('accepts complete and valid SMTP configuration', () => {
      const env = validateEnv(validSmtp);
      expect(env.EMAIL_PROVIDER).toBe('smtp');
      expect(env.SMTP_HOST).toBe('smtp.example.com');
      expect(env.SMTP_PORT).toBe(465);
      expect(env.SMTP_SECURE).toBe(true);
      expect(env.SMTP_USER).toBe('smtp_user@example.com');
      expect(env.SMTP_PASS).toBe('smtp_secret_pass');
      expect(env.EMAIL_FROM).toBe('noreply@example.com');
    });

    it('rejects missing SMTP_HOST when EMAIL_PROVIDER is smtp', () => {
      expect(() =>
        validateEnv({
          ...validSmtp,
          SMTP_HOST: '',
        }),
      ).toThrow(/SMTP_HOST.*required/);
    });

    it('rejects missing SMTP_USER when EMAIL_PROVIDER is smtp', () => {
      expect(() =>
        validateEnv({
          ...validSmtp,
          SMTP_USER: '',
        }),
      ).toThrow(/SMTP_USER.*required/);
    });

    it('rejects missing SMTP_PASS when EMAIL_PROVIDER is smtp', () => {
      expect(() =>
        validateEnv({
          ...validSmtp,
          SMTP_PASS: '',
        }),
      ).toThrow(/SMTP_PASS.*required/);
    });

    it('rejects invalid SMTP_PORT', () => {
      expect(() =>
        validateEnv({
          ...validSmtp,
          SMTP_PORT: '999999',
        }),
      ).toThrow(/SMTP_PORT/);
    });
  });

  it('rejects unsupported email providers', () => {
    expect(() =>
      validateEnv({
        ...required,
        EMAIL_PROVIDER: 'unimplemented_provider',
      }),
    ).toThrow(/EMAIL_PROVIDER/);
  });

  describe('KYC_STORAGE_PROVIDER configuration rules', () => {
    const validCloudinary = {
      ...required,
      KYC_STORAGE_PROVIDER: 'cloudinary',
      CLOUDINARY_CLOUD_NAME: 'demo-cloud',
      CLOUDINARY_API_KEY: '1234567890',
      CLOUDINARY_API_SECRET: 'secret-value',
    };

    it('defaults to the local dev/test provider', () => {
      const env = validateEnv(required);
      expect(env.KYC_STORAGE_PROVIDER).toBe('local');
      expect(env.KYC_UPLOAD_DIR).toBe('uploads/kyc');
      expect(env.CLOUDINARY_KYC_FOLDER).toBe('oruvia/kyc');
    });

    it('accepts complete Cloudinary configuration', () => {
      const env = validateEnv(validCloudinary);
      expect(env.KYC_STORAGE_PROVIDER).toBe('cloudinary');
      expect(env.CLOUDINARY_CLOUD_NAME).toBe('demo-cloud');
    });

    it('rejects missing Cloudinary credentials when the provider is cloudinary', () => {
      expect(() =>
        validateEnv({ ...validCloudinary, CLOUDINARY_CLOUD_NAME: '' }),
      ).toThrow(/CLOUDINARY_CLOUD_NAME.*required/);
      expect(() =>
        validateEnv({ ...validCloudinary, CLOUDINARY_API_KEY: '' }),
      ).toThrow(/CLOUDINARY_API_KEY.*required/);
      expect(() =>
        validateEnv({ ...validCloudinary, CLOUDINARY_API_SECRET: '' }),
      ).toThrow(/CLOUDINARY_API_SECRET.*required/);
    });

    it('rejects the local provider in production', () => {
      expect(() =>
        validateEnv({
          ...required,
          NODE_ENV: 'production',
          JWT_SECRET: 'a-very-strong-production-secret-with-at-least-32-chars!',
          KYC_STORAGE_PROVIDER: 'local',
        }),
      ).toThrow(/KYC_STORAGE_PROVIDER.*cloudinary.*production/);
    });

    it('rejects unknown providers', () => {
      expect(() =>
        validateEnv({ ...required, KYC_STORAGE_PROVIDER: 's3' }),
      ).toThrow(/KYC_STORAGE_PROVIDER/);
    });
  });
});

