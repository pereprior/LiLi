import { describe, expect, it } from 'vitest';

import { createAuthConfig } from '#src/auth/config/auth.config.js';

const validEnvironment = {
  APP_ORIGIN: 'http://localhost:3000',
  AUTH_GOOGLE_CLIENT_ID: 'test-client-id',
  AUTH_GOOGLE_CLIENT_SECRET: 'test-client-secret',
  AUTH_GOOGLE_ALLOWED_EMAILS: 'member@example.com, admin@example.com',
  AUTH_SESSION_ABSOLUTE_TTL_SECONDS: '2592000',
  AUTH_SESSION_IDLE_TTL_SECONDS: '604800',
  AUTH_SESSION_TOUCH_INTERVAL_SECONDS: '900',
  AUTH_OIDC_ATTEMPT_TTL_SECONDS: '600',
};

describe('createAuthConfig', () => {
  it('normalizes email lists and reads configured TTLs', () => {
    const config = createAuthConfig(validEnvironment);

    expect(config.google.allowedEmails).toEqual(
      new Set(['member@example.com', 'admin@example.com']),
    );
    expect(config.google.redirectUri).toBe(
      'http://localhost:3000/auth/google/callback',
    );
    expect(config.session).toEqual({
      absoluteTtlSeconds: 2_592_000,
      idleTtlSeconds: 604_800,
      touchIntervalSeconds: 900,
    });
    expect(config.oidcAttemptTtlSeconds).toBe(600);
  });

  it('rejects a missing required variable', () => {
    const environment: Record<string, string | undefined> = {
      ...validEnvironment,
    };
    delete environment.AUTH_GOOGLE_CLIENT_ID;

    expect(() => createAuthConfig(environment)).toThrow(
      'AUTH_GOOGLE_CLIENT_ID is required.',
    );
  });

  it('rejects a missing TTL', () => {
    const environment: Record<string, string | undefined> = {
      ...validEnvironment,
    };
    delete environment.AUTH_SESSION_ABSOLUTE_TTL_SECONDS;

    expect(() => createAuthConfig(environment)).toThrow(
      'AUTH_SESSION_ABSOLUTE_TTL_SECONDS is required.',
    );
  });

  it.each([
    ['AUTH_SESSION_ABSOLUTE_TTL_SECONDS', '0'],
    ['AUTH_SESSION_IDLE_TTL_SECONDS', '-1'],
    ['AUTH_SESSION_TOUCH_INTERVAL_SECONDS', '1.5'],
    ['AUTH_OIDC_ATTEMPT_TTL_SECONDS', 'invalid'],
  ])('rejects an invalid TTL for %s', (name, value) => {
    expect(() =>
      createAuthConfig({ ...validEnvironment, [name]: value }),
    ).toThrow(`${name} must be a positive integer.`);
  });

  it('rejects an empty allowlist', () => {
    expect(() =>
      createAuthConfig({
        ...validEnvironment,
        AUTH_GOOGLE_ALLOWED_EMAILS: ' ',
      }),
    ).toThrow('AUTH_GOOGLE_ALLOWED_EMAILS must not be empty.');
  });

  it('rejects an idle TTL greater than the absolute TTL', () => {
    expect(() =>
      createAuthConfig({
        ...validEnvironment,
        AUTH_SESSION_ABSOLUTE_TTL_SECONDS: '600',
        AUTH_SESSION_IDLE_TTL_SECONDS: '601',
      }),
    ).toThrow(
      'AUTH_SESSION_IDLE_TTL_SECONDS must be less than or equal to AUTH_SESSION_ABSOLUTE_TTL_SECONDS.',
    );
  });

  it('rejects a touch interval equal to the idle TTL', () => {
    expect(() =>
      createAuthConfig({
        ...validEnvironment,
        AUTH_SESSION_IDLE_TTL_SECONDS: '900',
      }),
    ).toThrow(
      'AUTH_SESSION_TOUCH_INTERVAL_SECONDS must be less than AUTH_SESSION_IDLE_TTL_SECONDS.',
    );
  });

  it('always uses secure cookies in production', () => {
    const config = createAuthConfig({
      ...validEnvironment,
      NODE_ENV: 'production',
    });

    expect(config.cookieSecure).toBe(true);
  });
});
