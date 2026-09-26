export type CreateOidcLoginAttemptData = {
  stateHash: string;
  nonce: string;
  codeVerifier: string;
  returnTo: string;
  expiresAt: Date;
};
