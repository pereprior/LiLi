export class OidcLoginAttemptEntity {
  constructor(
    public readonly uuid: string,
    public readonly stateHash: string,
    public readonly nonce: string,
    public readonly codeVerifier: string,
    public readonly returnTo: string,
    public readonly createdAt: Date,
    public readonly expiresAt: Date,
    public consumedAt: Date | null,
  ) {}
}
