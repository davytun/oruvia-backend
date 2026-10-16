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
      CORS_ORIGINS: '',
      DB_HOST: 'localhost',
      DB_PORT: 5432,
      DB_SSL: false,
      DB_LOGGING: false,
    });
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
});
