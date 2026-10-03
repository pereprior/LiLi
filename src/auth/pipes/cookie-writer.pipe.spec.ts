import { HttpAdapterHost } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CookieWriterPipe } from '#src/auth/pipes/cookie-writer.pipe.js';

describe('CookieWriterPipe', () => {
  let module: TestingModule;
  let pipe: CookieWriterPipe;
  const setCookie = vi.fn<HttpAdapterHost['httpAdapter']['setCookie']>();
  const clearCookie = vi.fn<HttpAdapterHost['httpAdapter']['clearCookie']>();

  beforeEach(async () => {
    setCookie.mockReset();
    clearCookie.mockReset();

    module = await Test.createTestingModule({
      providers: [
        CookieWriterPipe,
        {
          provide: HttpAdapterHost,
          useValue: { httpAdapter: { setCookie, clearCookie } },
        },
      ],
    }).compile();

    pipe = module.get(CookieWriterPipe);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Cookie writing', () => {
    it.each([
      { reason: 'secure', name: '__Host-lili_session', secure: true },
      { reason: 'development', name: 'lili_session', secure: false },
    ])(
      'sets a $reason cookie on the response with the requested lifetime and browser attributes',
      ({ name, secure }) => {
        const response = {};
        const writer = pipe.transform(response);

        writer.set(name, 'token', 60, secure);

        expect(setCookie).toHaveBeenCalledExactlyOnceWith(
          response,
          name,
          'token',
          {
            maxAge: 60,
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure,
          },
        );
        expect(clearCookie).not.toHaveBeenCalled();
      },
    );
  });

  describe('Cookie clearing', () => {
    it.each([
      { reason: 'secure', name: '__Host-lili_oidc_state', secure: true },
      { reason: 'development', name: 'lili_oidc_state', secure: false },
    ])(
      'clears a $reason cookie on the response with matching browser attributes',
      ({ name, secure }) => {
        const response = {};
        const writer = pipe.transform(response);

        writer.clear(name, secure);

        expect(clearCookie).toHaveBeenCalledExactlyOnceWith(response, name, {
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          secure,
        });
        expect(setCookie).not.toHaveBeenCalled();
      },
    );
  });
});
