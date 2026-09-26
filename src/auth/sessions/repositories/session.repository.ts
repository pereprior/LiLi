import type { SessionEntity } from '#src/auth/sessions/entities/session.entity.js';
import type { CreateSessionData } from '#src/auth/sessions/types/data/create-session.data.js';

export abstract class SessionRepository {
  abstract create(data: CreateSessionData): Promise<void>;
  abstract findByTokenHash(tokenHash: string): Promise<SessionEntity | null>;
  abstract touchIfValid(
    uuid: string,
    now: Date,
    idleCutoff: Date,
  ): Promise<boolean>;
  abstract revokeByTokenHash(tokenHash: string, now: Date): Promise<void>;
  abstract revokeByUserUuid(userUuid: string, now: Date): Promise<number>;
}
