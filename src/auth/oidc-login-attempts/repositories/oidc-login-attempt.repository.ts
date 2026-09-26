import type { OidcLoginAttemptEntity } from '#src/auth/oidc-login-attempts/entities/oidc-login-attempt.entity.js';
import type { CreateOidcLoginAttemptData } from '#src/auth/oidc-login-attempts/types/data/create-oidc-login-attempt.data.js';

export abstract class OidcLoginAttemptRepository {
  abstract create(
    data: CreateOidcLoginAttemptData,
  ): Promise<OidcLoginAttemptEntity>;

  abstract consume(
    stateHash: string,
    now: Date,
  ): Promise<OidcLoginAttemptEntity | null>;
}
