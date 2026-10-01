import type { CookieKind } from '#src/auth/types/cookie-kind.type.js';

const SECRET_PATTERN = /^[A-Za-z0-9_-]{43}$/u;

export class AuthCookiesUtils {
  static nameFor(kind: CookieKind, secure: boolean): string {
    return (secure ? '__Host-lili_' : 'lili_') + kind;
  }

  static read(cookieHeader: string | undefined, name: string): string | null {
    const matches = (cookieHeader ?? '')
      .split(';')
      .map((part) => part.trim())
      .filter((part) => part.startsWith(name + '='));

    if (matches.length !== 1) return null;

    const value = matches[0]?.slice(name.length + 1);
    return value && SECRET_PATTERN.test(value) ? value : null;
  }
}
