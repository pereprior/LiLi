export type CreateSessionData = {
  userUuid: string;
  tokenHash: string;
  csrfTokenHash: string;
  expiresAt: Date;
  lastUsedAt: Date;
};
