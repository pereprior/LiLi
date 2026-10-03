import { describe, expect, it } from 'vitest';

import { AuthEnvironmentValueUtils } from '#src/auth/utils/auth-environment-value/auth-environment-value.utils.js';

describe('AuthEnvironmentValueUtils', () => {
  describe('requireValue', () => {
    it('returns a trimmed required value', () => {
      const result = AuthEnvironmentValueUtils.requireValue(' value ', 'VALUE');

      expect(result).toBe('value');
    });

    it.each([
      { reason: 'missing', value: undefined },
      { reason: 'empty', value: '' },
      { reason: 'whitespace-only', value: '   ' },
    ])('rejects a $reason required value', ({ value }) => {
      expect(() =>
        AuthEnvironmentValueUtils.requireValue(value, 'VALUE'),
      ).toThrow(new Error('VALUE is required.'));
    });
  });

  describe('parseUrl', () => {
    it.each(['http://lili.example.com/path', 'https://lili.example.com/path'])(
      'parses %s without changing its content',
      (value) => {
        const result = AuthEnvironmentValueUtils.parseUrl(value, 'URL');

        expect(result).toEqual(new URL(value));
      },
    );

    it.each([
      { reason: 'invalid URL', value: 'not-a-url' },
      { reason: 'non-HTTP URL', value: 'ftp://lili.example.com' },
    ])('rejects an $reason', ({ value }) => {
      expect(() => AuthEnvironmentValueUtils.parseUrl(value, 'URL')).toThrow(
        new Error('URL must be a valid HTTP(S) URL.'),
      );
    });
  });

  describe('parseEmailList', () => {
    it('trims and lowercases email addresses', () => {
      const result = AuthEnvironmentValueUtils.parseEmailList(
        ' MEMBER@example.com, ADMIN@example.com ',
        'EMAILS',
      );

      expect(result).toEqual(
        new Set(['member@example.com', 'admin@example.com']),
      );
    });

    it('removes duplicate normalized addresses', () => {
      const result = AuthEnvironmentValueUtils.parseEmailList(
        'MEMBER@example.com,member@example.com',
        'EMAILS',
      );

      expect(result).toEqual(new Set(['member@example.com']));
    });

    it.each([
      { reason: 'missing', value: undefined },
      { reason: 'empty', value: '' },
      { reason: 'whitespace-only', value: '   ' },
    ])('returns an empty set for a $reason email list', ({ value }) => {
      const result = AuthEnvironmentValueUtils.parseEmailList(value, 'EMAILS');

      expect(result).toEqual(new Set());
    });

    it('rejects an invalid email address', () => {
      expect(() =>
        AuthEnvironmentValueUtils.parseEmailList('not-an-email', 'EMAILS'),
      ).toThrow(new Error('EMAILS contains an invalid email address.'));
    });
  });
});
