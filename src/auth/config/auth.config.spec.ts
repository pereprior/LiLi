import { describe, expect, it } from 'vitest';

import { createAuthConfig } from '#src/auth/config/auth.config.js';

describe('createAuthConfig', () => {
  describe('Google configuration', () => {
    it('normalizes the allowed email addresses', () => {
      const environment = {
        APP_ORIGIN: 'http://localhost:3000',
        AUTH_GOOGLE_CLIENT_ID: 'test-client-id',
        AUTH_GOOGLE_CLIENT_SECRET: 'test-client-secret',
        AUTH_GOOGLE_ALLOWED_EMAILS: ' MEMBER@example.com, ADMIN@example.com ',
      };

      const config = createAuthConfig(environment);

      expect(config.google.allowedEmails).toEqual(
        new Set(['member@example.com', 'admin@example.com']),
      );
    });

    it('derives the callback URL from the configured application origin', () => {
      const environment = {
        APP_ORIGIN: 'http://localhost:3000/path',
        AUTH_GOOGLE_CLIENT_ID: 'test-client-id',
        AUTH_GOOGLE_CLIENT_SECRET: 'test-client-secret',
        AUTH_GOOGLE_ALLOWED_EMAILS: 'member@example.com, admin@example.com',
      };

      const config = createAuthConfig(environment);

      expect(config.google.redirectUri).toBe(
        'http://localhost:3000/auth/google/callback',
      );
    });

    it('keeps the configured Google client credentials', () => {
      const environment = {
        APP_ORIGIN: 'http://localhost:3000',
        AUTH_GOOGLE_CLIENT_ID: 'test-client-id',
        AUTH_GOOGLE_CLIENT_SECRET: 'test-client-secret',
        AUTH_GOOGLE_ALLOWED_EMAILS: 'member@example.com, admin@example.com',
      };

      const config = createAuthConfig(environment);

      expect(config.google.clientId).toBe('test-client-id');
      expect(config.google.clientSecret).toBe('test-client-secret');
    });
  });

  describe('Required configuration', () => {
    it.each([
      {
        field: 'AUTH_GOOGLE_CLIENT_ID',
        expected: 'AUTH_GOOGLE_CLIENT_ID is required.',
      },
      {
        field: 'AUTH_GOOGLE_CLIENT_SECRET',
        expected: 'AUTH_GOOGLE_CLIENT_SECRET is required.',
      },
    ])('rejects an empty $field', ({ field, expected }) => {
      const environment = {
        APP_ORIGIN: 'http://localhost:3000',
        AUTH_GOOGLE_CLIENT_ID: 'test-client-id',
        AUTH_GOOGLE_CLIENT_SECRET: 'test-client-secret',
        AUTH_GOOGLE_ALLOWED_EMAILS: 'member@example.com, admin@example.com',
      };
      const invalidEnvironment = { ...environment, [field]: '' };

      expect(() => createAuthConfig(invalidEnvironment)).toThrow(
        new Error(expected),
      );
    });

    it('rejects an empty allowlist', () => {
      const environment = {
        APP_ORIGIN: 'http://localhost:3000',
        AUTH_GOOGLE_CLIENT_ID: 'test-client-id',
        AUTH_GOOGLE_CLIENT_SECRET: 'test-client-secret',
        AUTH_GOOGLE_ALLOWED_EMAILS: 'member@example.com, admin@example.com',
      };
      const invalidEnvironment = {
        ...environment,
        AUTH_GOOGLE_ALLOWED_EMAILS: ' ',
      };

      expect(() => createAuthConfig(invalidEnvironment)).toThrow(
        new Error('AUTH_GOOGLE_ALLOWED_EMAILS must not be empty.'),
      );
    });
  });

  describe('Application origin and cookie security', () => {
    it('uses secure cookies in production', () => {
      const environment = {
        APP_ORIGIN: 'https://lili.example.com',
        NODE_ENV: 'production',
        AUTH_GOOGLE_CLIENT_ID: 'test-client-id',
        AUTH_GOOGLE_CLIENT_SECRET: 'test-client-secret',
        AUTH_GOOGLE_ALLOWED_EMAILS: 'member@example.com, admin@example.com',
      };

      const config = createAuthConfig(environment);

      expect(config.cookieSecure).toBe(true);
    });

    it('uses ordinary cookies outside production', () => {
      const environment = {
        APP_ORIGIN: 'http://localhost:3000',
        AUTH_GOOGLE_CLIENT_ID: 'test-client-id',
        AUTH_GOOGLE_CLIENT_SECRET: 'test-client-secret',
        AUTH_GOOGLE_ALLOWED_EMAILS: 'member@example.com, admin@example.com',
      };

      const config = createAuthConfig(environment);

      expect(config.cookieSecure).toBe(false);
    });

    it('normalizes the application origin without a path', () => {
      const environment = {
        APP_ORIGIN: 'http://localhost:3000/path',
        AUTH_GOOGLE_CLIENT_ID: 'test-client-id',
        AUTH_GOOGLE_CLIENT_SECRET: 'test-client-secret',
        AUTH_GOOGLE_ALLOWED_EMAILS: 'member@example.com, admin@example.com',
      };

      const config = createAuthConfig(environment);

      expect(config.appOrigin).toBe('http://localhost:3000');
    });

    it('rejects HTTP origins in production', () => {
      const environment = {
        APP_ORIGIN: 'http://localhost:3000',
        NODE_ENV: 'production',
        AUTH_GOOGLE_CLIENT_ID: 'test-client-id',
        AUTH_GOOGLE_CLIENT_SECRET: 'test-client-secret',
        AUTH_GOOGLE_ALLOWED_EMAILS: 'member@example.com, admin@example.com',
      };

      expect(() => createAuthConfig(environment)).toThrow(
        new Error('APP_ORIGIN must use HTTPS in production.'),
      );
    });
  });
});
