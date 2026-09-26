import { describe, expect, it } from 'vitest';

import { AuthEnvironmentValueUtils } from '#src/auth/config/utils/auth-environment-value.utils.js';

describe('AuthEnvironmentValueUtils', () => {
  describe('requireValue', () => {
    it('returns a trimmed required value', () => {
      expect(AuthEnvironmentValueUtils.requireValue(' value ', 'VALUE')).toBe(
        'value',
      );
    });

    it.each([undefined, '', '   '])(
      'rejects an empty required value',
      (value) => {
        expect(() =>
          AuthEnvironmentValueUtils.requireValue(value, 'VALUE'),
        ).toThrow('VALUE is required.');
      },
    );
  });

  describe('parseUrl', () => {
    it('parses a valid URL', () => {
      expect(
        AuthEnvironmentValueUtils.parseUrl(
          'https://lili.example.com/path',
          'URL',
        ),
      ).toBeInstanceOf(URL);
    });

    it('rejects an invalid URL', () => {
      expect(() =>
        AuthEnvironmentValueUtils.parseUrl('not-a-url', 'URL'),
      ).toThrow('URL must be a valid HTTP(S) URL.');
    });

    it('rejects a non-HTTP URL', () => {
      expect(() =>
        AuthEnvironmentValueUtils.parseUrl('ftp://lili.example.com', 'URL'),
      ).toThrow('URL must be a valid HTTP(S) URL.');
    });
  });

  describe('parsePositiveInteger', () => {
    it.each([undefined, '', '  '])('rejects an empty value', (value) => {
      expect(() =>
        AuthEnvironmentValueUtils.parsePositiveInteger(value, 'TTL'),
      ).toThrow('TTL is required.');
    });

    it('parses a positive integer', () => {
      expect(AuthEnvironmentValueUtils.parsePositiveInteger('600', 'TTL')).toBe(
        600,
      );
    });

    it.each(['0', '-1', '1.5', 'invalid', '9007199254740992'])(
      'rejects an invalid integer',
      (value) => {
        expect(() =>
          AuthEnvironmentValueUtils.parsePositiveInteger(value, 'TTL'),
        ).toThrow('TTL must be a positive integer.');
      },
    );
  });

  describe('parseEmailList', () => {
    it('normalizes and de-duplicates emails', () => {
      expect(
        AuthEnvironmentValueUtils.parseEmailList(
          ' MEMBER@example.com,member@example.com ',
          'EMAILS',
        ),
      ).toEqual(new Set(['member@example.com']));
    });

    it('rejects an invalid email', () => {
      expect(() =>
        AuthEnvironmentValueUtils.parseEmailList('not-an-email', 'EMAILS'),
      ).toThrow('EMAILS contains an invalid email address.');
    });
  });
});
