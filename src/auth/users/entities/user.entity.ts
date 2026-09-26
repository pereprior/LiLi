import type { UserRole } from '#src/auth/users/types/enum/user-role.enum.js';
import type { UserStatus } from '#src/auth/users/types/enum/user-status.enum.js';

export class UserEntity {
  constructor(
    public readonly uuid: string,
    public username: string,
    public passwordHash: string | null,
    public role: UserRole,
    public status: UserStatus,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
