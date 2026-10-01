import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { AppModule } from '#src/app.module.js';
import { GoogleOidcClient } from '#src/auth/google-login/oidc/clients/google-oidc.client.js';
import type { AuthenticatedExternalIdentity } from '#src/auth/google-login/oidc/types/authenticated-external-identity.type.js';
import { configureApp } from '#src/config/app.config.js';
import { PrismaService } from '#src/database/prisma.service.js';

const allowedIdentity: AuthenticatedExternalIdentity = {
  subject: 'google-subject-1',
  email: 'member@example.com',
  emailVerified: true,
};

describe('Google login and local sessions', () => {
  let app: INestApplication;
  let baseUrl: string;
  let prisma: PrismaService;
  const createAuthorizationUrl =
    vi.fn<GoogleOidcClient['createAuthorizationUrl']>();
  const exchangeCode = vi.fn<GoogleOidcClient['exchangeCode']>();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GoogleOidcClient)
      .useValue({ createAuthorizationUrl, exchangeCode })
      .compile();

    app = module.createNestApplication();
    configureApp(app);
    await app.listen(0);
    baseUrl = await app.getUrl();
    prisma = module.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.oidcLoginAttempt.deleteMany();
    await prisma.user.deleteMany();
    createAuthorizationUrl.mockReset();
    exchangeCode.mockReset();
    createAuthorizationUrl.mockImplementation(({ state }) => {
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.searchParams.set('state', state);
      return Promise.resolve(url);
    });
    exchangeCode.mockResolvedValue(allowedIdentity);
  });

  afterAll(async () => {
    await prisma.session.deleteMany();
    await prisma.oidcLoginAttempt.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  async function startLogin(): Promise<{
    state: string;
    cookie: string;
    response: Response;
  }> {
    const response = await fetch(new URL('/auth/google', baseUrl), {
      redirect: 'manual',
    });
    const location = response.headers.get('location');
    const cookie = response.headers.get('set-cookie')?.split(';')[0];
    if (!location || !cookie) throw new Error('Login start did not redirect.');
    const state = new URL(location).searchParams.get('state');
    if (!state) throw new Error('Authorization URL has no state.');
    return { state, cookie, response };
  }

  async function completeLogin(
    state: string,
    cookie: string,
  ): Promise<Response> {
    const callback = new URL('/auth/google/callback', baseUrl);
    callback.searchParams.set('state', state);
    callback.searchParams.set('code', 'test-code');
    return fetch(callback, {
      headers: { cookie },
      redirect: 'manual',
    });
  }

  async function login(): Promise<{ sessionCookie: string; uuid: string }> {
    const attempt = await startLogin();
    const callback = await completeLogin(attempt.state, attempt.cookie);
    expect(callback.status).toBe(302);
    const sessionCookie = callback.headers
      .getSetCookie()
      .find((cookie) => cookie.startsWith('lili_session='))
      ?.split(';')[0];
    if (!sessionCookie) throw new Error('Callback did not create a session.');

    const me = await fetch(new URL('/auth/me', baseUrl), {
      headers: { cookie: sessionCookie },
    });
    expect(me.status).toBe(200);
    const user = (await me.json()) as { uuid: string; email: string };
    return { sessionCookie, uuid: user.uuid };
  }

  it('starts OIDC with a temporary browser cookie', async () => {
    const attempt = await startLogin();

    expect(attempt.response.status).toBe(302);
    expect(attempt.cookie).toBe('lili_oidc_state=' + attempt.state);
    expect(attempt.response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(attempt.response.headers.get('set-cookie')).toContain(
      'SameSite=Lax',
    );
    expect(await prisma.oidcLoginAttempt.count()).toBe(1);
  });

  it('creates a user and a private session for an allowed identity', async () => {
    const attempt = await startLogin();
    const callback = await completeLogin(attempt.state, attempt.cookie);

    expect(callback.status).toBe(302);
    expect(callback.headers.get('location')).toBe(
      'http://localhost:3000/auth/me',
    );
    expect(callback.headers.get('cache-control')).toBe('no-store');
    const cookies = callback.headers.getSetCookie();
    expect(
      cookies.some(
        (cookie) =>
          cookie.startsWith('lili_oidc_state=;') &&
          cookie.includes('Max-Age=0'),
      ),
    ).toBe(true);
    const sessionCookie = cookies.find((cookie) =>
      cookie.startsWith('lili_session='),
    );
    expect(sessionCookie).toContain('HttpOnly');
    expect(sessionCookie).toContain('SameSite=Lax');
    expect(sessionCookie).toContain('Max-Age=604800');
    expect(await prisma.user.count()).toBe(1);
    expect(await prisma.session.count()).toBe(1);

    const me = await fetch(new URL('/auth/me', baseUrl), {
      headers: { cookie: sessionCookie?.split(';')[0] ?? '' },
    });
    expect(me.status).toBe(200);
    const meBody = (await me.json()) as { uuid: string; email: string };
    expect(meBody.uuid).toBeTypeOf('string');
    expect(meBody.email).toBe('member@example.com');
  });

  it('uses the same user for later logins of the same subject', async () => {
    const first = await login();
    exchangeCode.mockResolvedValue({
      ...allowedIdentity,
      email: 'ADMIN@example.com',
    });

    const second = await login();
    expect(second.uuid).toBe(first.uuid);
    expect(await prisma.user.count()).toBe(1);
    expect(await prisma.session.count()).toBe(2);
    expect(
      await prisma.user.findUnique({
        where: { googleSubject: allowedIdentity.subject },
      }),
    ).toMatchObject({ email: 'admin@example.com' });
  });

  it('rejects an unverified or disallowed email', async () => {
    for (const identity of [
      { ...allowedIdentity, emailVerified: false },
      { ...allowedIdentity, email: 'outside@example.com' },
    ]) {
      exchangeCode.mockResolvedValue(identity);
      const attempt = await startLogin();
      const callback = await completeLogin(attempt.state, attempt.cookie);
      expect(callback.status).toBe(403);
    }
    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.session.count()).toBe(0);
  });

  it('rejects a callback without matching browser state', async () => {
    const attempt = await startLogin();
    const callback = await completeLogin(
      attempt.state,
      'lili_oidc_state=wrong',
    );

    expect(callback.status).toBe(400);
    expect(
      callback.headers
        .getSetCookie()
        .some(
          (cookie) =>
            cookie.startsWith('lili_oidc_state=;') &&
            cookie.includes('Max-Age=0'),
        ),
    ).toBe(true);
    expect(exchangeCode).not.toHaveBeenCalled();
    expect(await prisma.session.count()).toBe(0);
  });

  it('rejects a callback with duplicate state parameters', async () => {
    const attempt = await startLogin();
    const callback = new URL('/auth/google/callback', baseUrl);
    callback.searchParams.append('state', attempt.state);
    callback.searchParams.append('state', attempt.state);
    callback.searchParams.set('code', 'test-code');

    const response = await fetch(callback, {
      headers: { cookie: attempt.cookie },
      redirect: 'manual',
    });

    expect(response.status).toBe(400);
    expect(exchangeCode).not.toHaveBeenCalled();
    expect(await prisma.session.count()).toBe(0);
  });

  it('never creates two users for concurrent callbacks of one subject', async () => {
    const first = await startLogin();
    const second = await startLogin();
    const callbacks = await Promise.all([
      completeLogin(first.state, first.cookie),
      completeLogin(second.state, second.cookie),
    ]);

    expect(callbacks.map((response) => response.status)).toEqual([302, 302]);
    expect(await prisma.user.count()).toBe(1);
    expect(await prisma.session.count()).toBe(2);
  });

  it('requires a valid cookie for private routes', async () => {
    expect((await fetch(new URL('/auth/me', baseUrl))).status).toBe(401);
    expect(
      (
        await fetch(new URL('/auth/me', baseUrl), {
          headers: { cookie: 'lili_session=invalid' },
        })
      ).status,
    ).toBe(401);
  });

  it('revokes the session on logout', async () => {
    const { sessionCookie } = await login();
    const logout = await fetch(new URL('/auth/logout', baseUrl), {
      method: 'POST',
      headers: { cookie: sessionCookie, origin: 'http://localhost:3000' },
    });

    expect(logout.status).toBe(204);
    expect(logout.headers.get('set-cookie')).toContain('lili_session=;');
    expect(logout.headers.get('set-cookie')).toContain('Max-Age=0');
    expect(
      (
        await fetch(new URL('/auth/me', baseUrl), {
          headers: { cookie: sessionCookie },
        })
      ).status,
    ).toBe(401);
  });

  it('rejects mutable requests without the expected origin', async () => {
    const { sessionCookie } = await login();
    for (const headers of [
      { cookie: sessionCookie },
      { cookie: sessionCookie, origin: 'https://evil.example' },
      { cookie: sessionCookie, origin: 'http://localhost:3000.evil.example' },
    ]) {
      const response = await fetch(new URL('/auth/logout', baseUrl), {
        method: 'POST',
        headers,
      });
      expect(response.status).toBe(403);
    }
    expect(
      (
        await fetch(new URL('/auth/me', baseUrl), {
          headers: { cookie: sessionCookie },
        })
      ).status,
    ).toBe(200);
  });

  it('accepts same-origin Referer when Origin is absent', async () => {
    const { sessionCookie } = await login();
    const response = await fetch(new URL('/auth/logout', baseUrl), {
      method: 'POST',
      headers: {
        cookie: sessionCookie,
        referer: 'http://localhost:3000/tasks',
      },
    });
    expect(response.status).toBe(204);
  });

  it.each([
    ['GET', '/auth/users'],
    ['POST', '/auth/users'],
    ['PATCH', '/auth/users/any'],
    ['DELETE', '/auth/users/any'],
  ])('%s %s remains unavailable', async (method, path) => {
    const response = await fetch(new URL(path, baseUrl), { method });
    expect(response.status).toBe(404);
  });
});
