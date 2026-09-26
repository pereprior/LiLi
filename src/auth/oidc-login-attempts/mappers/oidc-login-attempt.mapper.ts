import type { OidcLoginAttempt } from '@prisma/client';

import { OidcLoginAttemptEntity } from '#src/auth/oidc-login-attempts/entities/oidc-login-attempt.entity.js';

export class OidcLoginAttemptMapper {
  static toEntity(attempt: OidcLoginAttempt): OidcLoginAttemptEntity {
    return new OidcLoginAttemptEntity(
      attempt.uuid,
      attempt.stateHash,
      attempt.nonce,
      attempt.codeVerifier,
      attempt.returnTo,
      attempt.createdAt,
      attempt.expiresAt,
      attempt.consumedAt,
    );
  }
}
