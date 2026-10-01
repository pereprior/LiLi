import { describe, expect, it } from 'vitest';

import { createAuthConfig } from '#src/auth/config/auth.config.js';

const validEnvironment = {
  APP_ORIGIN: 'http://localhost:3000',
  AUTH_GOOGLE_CLIENT_ID: 'test-client-id',
  AUTH_GOOGLE_CLIENT_SECRET: 'test-client-secret',
  AUTH_GOOGLE_ALLOWED_EMAILS: 'member@example.com, admin@example.com',
};

describe('createAuthConfig', () => {
  it('normalizes allowed emails and derives the callback URL', () => {
    const config = createAuthConfig(validEnvironment);

    expect(config.google.allowedEmails).toEqual(
      new Set(['member@example.com', 'admin@example.com']),
    );
    expect(config.google.redirectUri).toBe(
      'http://localhost:3000/auth/google/callback',
    );
  });

  it('rejects a missing client ID', () => {
    expect(() =>
      createAuthConfig({ ...validEnvironment, AUTH_GOOGLE_CLIENT_ID: '' }),
    ).toThrow('AUTH_GOOGLE_CLIENT_ID is required.');
  });

  it('rejects an empty allowlist', () => {
    expect(() =>
      createAuthConfig({
        ...validEnvironment,
        AUTH_GOOGLE_ALLOWED_EMAILS: ' ',
      }),
    ).toThrow('AUTH_GOOGLE_ALLOWED_EMAILS must not be empty.');
  });

  it('uses secure cookies in production', () => {
    expect(
      createAuthConfig({
        ...validEnvironment,
        APP_ORIGIN: 'https://lili.example.com',
        NODE_ENV: 'production',
      }).cookieSecure,
    ).toBe(true);
  });
  it('rejects HTTP origins in production', () => {
    expect(() =>
      createAuthConfig({ ...validEnvironment, NODE_ENV: 'production' }),
    ).toThrow('APP_ORIGIN must use HTTPS in production.');
  });
});
