import type { Session, User } from '@prisma/client';

export type SessionRecord = Session & {
  user: User;
};
