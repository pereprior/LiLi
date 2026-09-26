export type AuthConfig = {
  appOrigin: string;
  google: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    allowedEmails: ReadonlySet<string>;
  };
  session: {
    absoluteTtlSeconds: number;
    idleTtlSeconds: number;
    touchIntervalSeconds: number;
  };
  oidcAttemptTtlSeconds: number;
  cookieSecure: boolean;
};
