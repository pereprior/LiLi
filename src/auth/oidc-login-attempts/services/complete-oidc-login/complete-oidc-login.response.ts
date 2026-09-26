import type { AuthenticatedExternalIdentity } from '#src/auth/identities/types/authenticated-external-identity.type.js';

export class CompleteOidcLoginResponse {
  constructor(
    public readonly identity: AuthenticatedExternalIdentity,
    public readonly returnTo: string,
  ) {}
}
