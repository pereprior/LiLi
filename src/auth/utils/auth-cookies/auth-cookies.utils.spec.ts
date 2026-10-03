import { describe, expect, it } from 'vitest';

import { AuthCookiesUtils } from '#src/auth/utils/auth-cookies/auth-cookies.utils.js';

describe('AuthCookiesUtils', () => {
  describe('nameFor', () => {
    it.each([
      { kind: 'session', secure: true, expected: '__Host-lili_session' },
      { kind: 'oidc_state', secure: true, expected: '__Host-lili_oidc_state' },
      { kind: 'session', secure: false, expected: 'lili_session' },
      { kind: 'oidc_state', secure: false, expected: 'lili_oidc_state' },
    ] as const)(
      'names $kind cookies with secure=$secure as $expected',
      ({ kind, secure, expected }) => {
        const name = AuthCookiesUtils.nameFor(kind, secure);

        expect(name).toBe(expected);
      },
    );
  });

  describe('read', () => {
    it('reads a valid secret from the requested cookie among other cookies', () => {
      const token = 'a'.repeat(43);
      const cookieHeader = `other=value; lili_session=${token}`;

      const result = AuthCookiesUtils.read(cookieHeader, 'lili_session');

      expect(result).toBe(token);
    });

    it.each([
      { reason: 'absent header', cookieHeader: undefined },
      { reason: 'missing cookie', cookieHeader: 'other=value' },
      {
        reason: 'duplicated cookie',
        cookieHeader: `lili_session=${'a'.repeat(43)}; lili_session=${'a'.repeat(43)}`,
      },
      { reason: 'malformed secret', cookieHeader: 'lili_session=invalid' },
      {
        reason: 'invalid character',
        cookieHeader: `lili_session=${'a'.repeat(42)}!`,
      },
      { reason: 'empty value', cookieHeader: 'lili_session=' },
      {
        reason: 'different cookie with a matching prefix',
        cookieHeader: `lili_session_other=${'a'.repeat(43)}`,
      },
    ])('returns null for $reason', ({ cookieHeader }) => {
      const result = AuthCookiesUtils.read(cookieHeader, 'lili_session');

      expect(result).toBeNull();
    });
  });
});
