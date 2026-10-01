import type { HttpAdapterHost } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';

import { CookieWriterPipe } from '#src/auth/pipes/cookie-writer.pipe.js';

describe('CookieWriterPipe', () => {
  it('sets session cookies through the Nest HTTP adapter with secure attributes', () => {
    const setCookie = vi.fn();
    const response = {};
    const adapterHost = {
      httpAdapter: { setCookie },
    } as unknown as HttpAdapterHost;

    new CookieWriterPipe(adapterHost)
      .transform(response)
      .set('__Host-lili_session', 'token', 60, true);

    expect(setCookie).toHaveBeenCalledWith(
      response,
      '__Host-lili_session',
      'token',
      {
        maxAge: 60,
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
      },
    );
  });

  it('clears cookies through the Nest HTTP adapter with matching attributes', () => {
    const clearCookie = vi.fn();
    const response = {};
    const adapterHost = {
      httpAdapter: { clearCookie },
    } as unknown as HttpAdapterHost;

    new CookieWriterPipe(adapterHost)
      .transform(response)
      .clear('lili_oidc_state', false);

    expect(clearCookie).toHaveBeenCalledWith(response, 'lili_oidc_state', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
    });
  });
});
