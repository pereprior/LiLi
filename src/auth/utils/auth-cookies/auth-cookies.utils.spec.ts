import { describe, expect, it } from 'vitest';

import { AuthCookiesUtils } from '#src/auth/utils/auth-cookies/auth-cookies.utils.js';

const token = 'a'.repeat(43);

describe('AuthCookiesUtils', () => {
  it('uses the host-only prefix for secure cookies', () => {
    expect(AuthCookiesUtils.nameFor('session', true)).toBe(
      '__Host-lili_session',
    );
    expect(AuthCookiesUtils.nameFor('oidc_state', false)).toBe(
      'lili_oidc_state',
    );
  });

  it('reads one valid token from the request cookies', () => {
    expect(
      AuthCookiesUtils.read(
        `other=value; lili_session=${token}`,
        'lili_session',
      ),
    ).toBe(token);
  });

  it.each([
    ['missing', 'other=value'],
    ['duplicated', `lili_session=${token}; lili_session=${token}`],
    ['malformed', 'lili_session=invalid'],
  ])('rejects a %s cookie', (_reason, cookie) => {
    expect(AuthCookiesUtils.read(cookie, 'lili_session')).toBeNull();
  });
});
