import { Factory } from 'fishery';

import { UserEntity } from '#src/auth/users/entities/user.entity.js';
import { UserRole } from '#src/auth/users/types/enum/user-role.enum.js';
import { UserStatus } from '#src/auth/users/types/enum/user-status.enum.js';

export const userEntityFactory = Factory.define<UserEntity>(({ sequence }) => {
  const now = new Date('2026-09-12T00:00:00.000Z');

  return new UserEntity(
    `user-${sequence}`,
    `user-${sequence}`,
    'hashed-password',
    UserRole.MEMBER,
    UserStatus.ACTIVE,
    now,
    now,
  );
});
