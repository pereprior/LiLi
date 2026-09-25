import type { UserEntity } from '#src/auth/users/entities/user.entity.js';

export class SessionEntity {
  constructor(
    public readonly uuid: string,
    public readonly userUuid: string,
    public readonly csrfTokenHash: string,
    public readonly expiresAt: Date,
    public lastUsedAt: Date,
    public revokedAt: Date | null,
    public readonly user: UserEntity,
  ) {}
}
