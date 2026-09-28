import { registerAs } from '@nestjs/config';

import type { AuthConfig } from '#src/auth/config/types/auth-config.type.js';
import { AuthEnvironmentValueUtils } from '#src/auth/config/utils/auth-environment-value.utils.js';

export const AUTH_CONFIG_KEY = 'auth';
const GOOGLE_CALLBACK_PATH = '/auth/google/callback';

export function createAuthConfig(
  environment: Record<string, string | undefined>,
): AuthConfig {
  const appOrigin = AuthEnvironmentValueUtils.parseUrl(
    environment.APP_ORIGIN,
    'APP_ORIGIN',
  );
  const redirectUri = new URL(GOOGLE_CALLBACK_PATH, appOrigin);
  const allowedEmails = AuthEnvironmentValueUtils.parseEmailList(
    environment.AUTH_GOOGLE_ALLOWED_EMAILS,
    'AUTH_GOOGLE_ALLOWED_EMAILS',
  );
  if (allowedEmails.size === 0) {
    throw new Error('AUTH_GOOGLE_ALLOWED_EMAILS must not be empty.');
  }

  return {
    appOrigin: appOrigin.origin,
    google: {
      clientId: AuthEnvironmentValueUtils.requireValue(
        environment.AUTH_GOOGLE_CLIENT_ID,
        'AUTH_GOOGLE_CLIENT_ID',
      ),
      clientSecret: AuthEnvironmentValueUtils.requireValue(
        environment.AUTH_GOOGLE_CLIENT_SECRET,
        'AUTH_GOOGLE_CLIENT_SECRET',
      ),
      redirectUri: redirectUri.toString(),
      allowedEmails,
    },
    cookieSecure: environment.NODE_ENV === 'production',
  };
}

export const authConfig = registerAs(AUTH_CONFIG_KEY, (): AuthConfig =>
  createAuthConfig(process.env),
);

export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  const stringEnvironment = Object.fromEntries(
    Object.entries(environment).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );

  createAuthConfig(stringEnvironment);

  return environment;
}
