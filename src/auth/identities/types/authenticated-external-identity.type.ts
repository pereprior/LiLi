export type AuthenticatedExternalIdentity = {
  issuer: string;
  subject: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
};
