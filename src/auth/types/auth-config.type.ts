export type AuthConfig = {
  appOrigin: string;
  google: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    allowedEmails: ReadonlySet<string>;
  };
  cookieSecure: boolean;
};
